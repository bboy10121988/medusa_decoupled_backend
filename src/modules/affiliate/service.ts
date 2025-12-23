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
        const affLinks = await this.listAffiliateLinks({ affiliate_id: affiliate.id })
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
