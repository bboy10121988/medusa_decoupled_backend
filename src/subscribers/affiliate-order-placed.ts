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
      fields: ["id", "display_id", "total", "metadata", "currency_code"],
      filters: {
        id: data.id,
      },
    })

    if (!order) {
      console.warn(`[Affiliate Subscriber] Order ${data.id} not found in query.graph`)
      return
    }

    console.log(`[Affiliate Subscriber] Order Found: ${(order as any).display_id}. Metadata:`, JSON.stringify(order.metadata))

    // Check if order has affiliate info in metadata
    const linkId = (order.metadata as any)?.affiliate_link_id

    if (linkId) {
      console.log(`[Affiliate Subscriber] Found affiliate_link_id: ${linkId}. Registering conversion...`)
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
      console.log(`[Affiliate Subscriber] No affiliate_link_id found in metadata for order ${order.id}`)
    }
  } catch (error) {
    console.error("❌ [Affiliate Subscriber] FATAL ERROR:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
