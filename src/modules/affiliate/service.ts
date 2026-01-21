import { MedusaService } from "@medusajs/framework/utils"
import { Affiliate } from "./models/affiliate"
import { AffiliateLink } from "./models/affiliate-link"
import { AffiliateClick } from "./models/affiliate-click"
import { AffiliateConversion } from "./models/affiliate-conversion"
import { AffiliateSettlement } from "./models/affiliate-settlement"

class AffiliateService extends MedusaService({
  Affiliate,
  AffiliateLink,
  AffiliateClick,
  AffiliateConversion,
  AffiliateSettlement,
}) {
  // Custom methods can be added here
  async registerConversion(data: {
    order_id: string,
    order_amount: number,
    link_id: string,
    metadata?: Record<string, any>
  }) {
    const fs = require('fs');
    const log = (msg: string) => {
      try {
        fs.appendFileSync('/tmp/affiliate-service-debug.log', `[${new Date().toISOString()}] ${msg}\n`);
      } catch (e) { }
    }

    log(`[AffiliateService] Registering conversion for order: ${data.order_id}, link_id: ${data.link_id}`)
    console.log("[AffiliateService] Registering conversion for order:", data.order_id)

    // 1. Find the link and associated affiliate
    let links = await this.listAffiliateLinks(
      { id: data.link_id },
      { relations: ['affiliate'] }
    )

    if (!links.length) {
      links = await this.listAffiliateLinks(
        { code: data.link_id },
        { relations: ['affiliate'] }
      )
    }

    // FINAL FALLBACK: If nothing found by link code, check if the input is an Affiliate Code
    if (!links.length) {
      console.log(`[AffiliateService] Searching by affiliate code: ${data.link_id}`)
      const affiliates = await this.listAffiliates({ code: data.link_id })
      if (affiliates.length > 0) {
        const affiliate = affiliates[0]
        // Try to find any link for this affiliate to use as a placeholder
        const affLinks = await this.listAffiliateLinks({ affiliate: { id: affiliate.id } })
        if (affLinks.length > 0) {
          links = [{ ...affLinks[0], affiliate } as any]
          console.log(`[AffiliateService] Attribution via Affiliate Code fallback to link: ${affLinks[0].id}`)
        } else {
          console.warn(`[AffiliateService] Affiliate ${affiliate.id} has no links. Cannot attribute.`)
        }
      }
    }

    if (!links.length) {
      console.warn(`[AffiliateService] Link/Affiliate Code ${data.link_id} not found for order ${data.order_id}`)
      return null
    }

    const link = links[0]
    const affiliate = link.affiliate

    if (!affiliate) {
      console.warn(`[AffiliateService] Affiliate not found for link ${link.id}`)
      return null
    }

    if (affiliate.status !== 'active') {
      console.warn(`[AffiliateService] Affiliate ${affiliate.id} is not active. Status: ${affiliate.status}`)
      return null
    }

    // 2. Calculate Commission
    const rate = affiliate.commission_rate ?? 0.1 // Default 10% if missing
    const orderAmount = Number(data.order_amount || 0)
    const commissionAmount = Math.floor(orderAmount * rate) // Integer math (cents) or float? Medusa usually uses cents/smallest unit.

    console.log(`[AffiliateService] Commission Calc: amount=${orderAmount}, rate=${rate}, result=${commissionAmount}`)

    // 3. Create Conversion Record
    const conversion = await this.createAffiliateConversions({
      order_id: data.order_id,
      amount: data.order_amount,
      commission: commissionAmount,
      status: 'pending',
      affiliate_id: affiliate.id,
      link_id: link.id,
      metadata: data.metadata || {}
    })

    // 4. Update Link Statistics
    await this.updateAffiliateLinks({
      id: link.id,
      conversions: (link.conversions || 0) + 1
    })

    // 5. Update Affiliate Balances
    // Note: 'balance' usually means available for withdrawal (confirmed). 
    // 'total_earnings' might mean lifetime earnings (pending + confirmed).
    // For now, let's update total_earnings to reflect this new transaction.
    // balance usually updates when status becomes 'confirmed' (after return period).

    // BUT for simplicity in this version, let's assume 'balance' includes pending or we just track it.
    // Let's just update total_earnings for now. Real payout logic should check 'confirmed' conversions.
    const currentTotal = typeof affiliate.total_earnings === 'number'
      ? affiliate.total_earnings
      : parseFloat(affiliate.total_earnings as any || '0')

    // Also update balance if you want them to see it immediately (as pending)
    const currentBalance = typeof affiliate.balance === 'number'
      ? affiliate.balance
      : parseFloat(affiliate.balance as any || '0')

    await this.updateAffiliates({
      id: affiliate.id,
      total_earnings: currentTotal + commissionAmount,
      balance: currentBalance + commissionAmount // Adding to balance immediately as "pending balance"
    })

    console.log("[AffiliateService] Conversion registered:", conversion.id)
    return conversion
  }

  /**
   * 從 Promotion 註冊轉換 (折扣碼分潤)
   */
  async registerConversionFromPromotion(data: {
    order_id: string;
    order_subtotal: number;      // 折扣後小計
    shipping_total: number;      // 運費
    promo_code: string;          // 使用的折扣碼
    affiliate_id: string;        // 聯盟會員 ID
    commission_rate: number;     // 佣金比例 (從 promotion.metadata 取得)
    metadata?: Record<string, any>;
  }) {
    const { order_id, order_subtotal, shipping_total, promo_code, affiliate_id, commission_rate, metadata } = data;

    // 1. 查找聯盟會員
    const affiliate = await this.retrieveAffiliate(affiliate_id);
    if (!affiliate || affiliate.status !== "active") {
      console.log(`[Affiliate] Affiliate ${affiliate_id} not active, skipping conversion`);
      return null;
    }

    // 2. 計算佣金基準 = 折扣後小計 - 運費
    const commissionBase = order_subtotal - shipping_total;
    if (commissionBase <= 0) {
      console.log(`[Affiliate] Commission base is ${commissionBase}, skipping`);
      return null;
    }

    // 3. 計算佣金
    const commission = Math.floor(commissionBase * commission_rate);

    // 4. 建立轉換記錄
    const conversion = await this.createAffiliateConversions({
      affiliate_id,
      link_id: null,  // 折扣碼來源沒有 link
      order_id,
      amount: commissionBase,
      commission,
      status: "pending",
      source_type: "promo_code",
      promo_code,
      metadata: {
        ...metadata,
        commission_rate,
        order_subtotal,
        shipping_total,
      },
    });

    // 5. 更新聯盟會員餘額
    const currentTotal = Number(affiliate.total_earnings || 0);
    const currentBalance = Number(affiliate.balance || 0);

    await this.updateAffiliates({
      id: affiliate_id,
      balance: currentBalance + commission,
      total_earnings: currentTotal + commission,
    });

    console.log(`[Affiliate] Registered promo code conversion: ${promo_code}, commission: ${commission}`);
    return conversion;
  }

  async settleAffiliate(affiliateId: string) {
    console.log(`[AffiliateService] Settling balance for affiliate: ${affiliateId}`)

    const affiliate = await this.retrieveAffiliate(affiliateId)
    if (!affiliate) {
      throw new Error("Affiliate not found")
    }

    const balance = Number(affiliate.balance || 0)
    if (balance <= 0) {
      throw new Error("Affiliate has no balance to settle")
    }

    // 1. Create Settlement Record
    const settlement = await this.createAffiliateSettlements({
      affiliate_id: affiliate.id,
      amount: balance,
      currency_code: 'USD', // Default or from settings? Assuming USD for now or derive from region
      status: 'paid',
      period_end: new Date(),
      metadata: {
        settled_at: new Date().toISOString(),
        settled_by: 'admin_action'
      }
    })

    // 2. Reset Affiliate Balance
    await this.updateAffiliates({
      id: affiliate.id,
      balance: 0
    })

    console.log(`[AffiliateService] Settled ${balance} for affiliate ${affiliate.id}`)
    return settlement
  }

  async captureConversion(orderId: string) {
    console.log(`[AffiliateService] Capturing conversion for order: ${orderId}`)

    // 1. Find pending conversions for this order
    const conversions = await this.listAffiliateConversions(
      { order_id: orderId, status: "pending" }
    )

    if (!conversions.length) {
      console.log(`[AffiliateService] No pending conversions found for order ${orderId} to capture`)
      return
    }

    for (const conversion of conversions) {
      // 2. Mark conversion as captured
      await this.updateAffiliateConversions({
        id: conversion.id,
        status: "captured", // or 'confirmed' depending on logic. 'captured' matches payment status.
        metadata: {
          ...conversion.metadata as any,
          captured_at: new Date().toISOString()
        }
      })

      console.log(`[AffiliateService] Captured conversion ${conversion.id} for order ${orderId}`)

      // Note: We already added to 'balance' / 'total_earnings' as pending in registerConversion.
      // If we separate pending/captured balance in DB, we would move funds here.
      // For now, the frontend purely filters by conversion status ('pending' vs 'captured'), 
      // so enabling the status change from 'pending' to 'captured' is sufficient to move the money 
      // from "待確認" (Pending) to "可結算" (Captured/Confirmed) columns.
    }
  }

  async cancelConversion(orderId: string, reason: string = "order_canceled") {
    console.log(`[AffiliateService] Canceling conversion for order: ${orderId}, Reason: ${reason}`)

    // 1. Find existing conversions for this order
    const conversions = await this.listAffiliateConversions(
      { order_id: orderId, status: "pending" } // Only pending can be canceled/deducted easily
    )

    if (!conversions.length) {
      console.log(`[AffiliateService] No pending conversions found for order ${orderId}`)
      return
    }

    for (const conversion of conversions) {
      // 2. Mark conversion as cancelled
      await this.updateAffiliateConversions({
        id: conversion.id,
        status: "cancelled",
        metadata: {
          ...conversion.metadata as any,
          cancel_reason: reason,
          canceled_at: new Date().toISOString()
        }
      })

      // 3. Find affiliate to deduct balances
      const affiliate = await this.retrieveAffiliate(conversion.affiliate_id)
      if (affiliate) {
        const commissionAmount = Number(conversion.commission)

        const currentTotal = Number(affiliate.total_earnings || 0)
        const currentBalance = Number(affiliate.balance || 0)

        await this.updateAffiliates({
          id: affiliate.id as string,
          total_earnings: Math.max(0, currentTotal - commissionAmount),
          balance: Math.max(0, currentBalance - commissionAmount)
        })

        console.log(`[AffiliateService] Deducted ${commissionAmount} from affiliate ${affiliate.id}`)
      }
    }
  }
}

export default AffiliateService
