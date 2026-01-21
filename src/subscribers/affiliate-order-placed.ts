import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function affiliateOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

  try {
    const fs = require('fs');
    const log = (msg: string) => {
      try {
        fs.appendFileSync('/tmp/affiliate-sub-debug.log', `[${new Date().toISOString()}] ${msg}\n`);
      } catch (e) { }
    }

    log(`[Affiliate Subscriber] Processing order.placed event for ID: ${data.id}`)
    console.log(`[Affiliate Subscriber] Processing order.placed event for ID: ${data.id}`)

    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "total",
        "subtotal",
        "shipping_total",
        "discount_total",
        "metadata",
        "currency_code",
        "promotions.*"
      ],
      filters: {
        id: data.id,
      },
    })

    if (!order) {
      console.warn(`[Affiliate Subscriber] Order ${data.id} not found in query.graph`)
      return
    }

    console.log(`[Affiliate Subscriber] Order Found: ${(order as any).display_id}. Metadata:`, JSON.stringify(order.metadata))

    // ========== 方式一：折扣碼追蹤 (新增) ==========
    let promoCodeHandled = false;
    if (order.promotions && order.promotions.length > 0) {
      for (const promotion of order.promotions) {
        // 檢查是否為聯盟折扣碼 (metadata 中有 affiliate_id)
        const affiliateId = promotion.metadata?.affiliate_id;
        const commissionRate = promotion.metadata?.commission_rate;

        if (affiliateId && commissionRate) {
          console.log(`[Affiliate Subscriber] Found affiliate promo code: ${promotion.code}`);

          // 計算佣金基準 = subtotal - discount_total - shipping_total
          // 注意：subtotal 是折扣前，需要減去 discount_total
          const orderSubtotalAfterDiscount = order.subtotal - order.discount_total;

          await affiliateService.registerConversionFromPromotion({
            order_id: order.id,
            order_subtotal: orderSubtotalAfterDiscount,
            shipping_total: order.shipping_total || 0,
            promo_code: promotion.code,
            affiliate_id: affiliateId as string,
            commission_rate: Number(commissionRate),
            metadata: {
              order_display_id: (order as any).display_id,
              currency_code: order.currency_code,
              order_total: order.total,
              discount_total: order.discount_total,
              promotion_id: promotion.id,
            },
          });

          promoCodeHandled = true;
          // 找到一個聯盟折扣碼就處理，避免重複計算
          break;
        }
      }
    }

    // ========== 方式二：連結追蹤 (保留現有邏輯) ==========
    // 只有在沒有使用折扣碼追蹤的情況下，才檢查連結追蹤 (或者根據業務需求決定是否並行，這裡假設互斥或折扣碼優先)
    // 實際上如果已經被 Promotion 歸因，通常不應該再歸因給 Link，除非是不同的聯盟會員（但這會導致雙重佣金）
    // 這裡我們加一個檢查：如果已經 promoCodeHandled 則跳過 Link 檢查
    const linkId = (order.metadata as any)?.affiliate_link_id

    if (!promoCodeHandled && linkId) {
      console.log(`[Affiliate Subscriber] Found affiliate_link_id: ${linkId}. Registering conversion...`)

      // 檢查是否已經有轉換（避免重複，雖然這裡因為已經檢查 promoCodeHandled 所以不太可能衝突）
      const existingConversions = await affiliateService.listAffiliateConversions({
        order_id: order.id
      })

      if (existingConversions.length === 0) {
        const conversion = await affiliateService.registerConversion({
          order_id: order.id,
          order_amount: order.total,
          link_id: linkId,
          metadata: {
            order_display_id: (order as any).display_id,
            currency_code: order.currency_code
          }
        })
        if (conversion) {
          console.log(`✅ [Affiliate Subscriber] Conversion registered successfully: ${conversion.id}`)
        } else {
          console.warn(`❌ [Affiliate Subscriber] registerConversion returned null for order ${order.id}`)
        }
      } else {
        console.log(`[Affiliate Subscriber] Order ${order.id} already has conversion, skipping link tracking`)
      }
    } else if (!promoCodeHandled) {
      console.log(`[Affiliate Subscriber] No affiliate_link_id found in metadata for order ${order.id}`)
    }
  } catch (error) {
    console.error("❌ [Affiliate Subscriber] FATAL ERROR:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
