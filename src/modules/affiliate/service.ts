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
    console.log("[AffiliateService] Registering conversion for order:", data.order_id)

    // 1. Find the link and associated affiliate
    const links = await this.listAffiliateLinks(
      { id: data.link_id },
      { relations: ['affiliate'] }
    )

    if (!links.length) {
      console.warn(`[AffiliateService] Link ${data.link_id} not found for order ${data.order_id}`)
      return null
    }

    const link = links[0]
    const affiliate = link.affiliate

    if (!affiliate) {
      console.warn(`[AffiliateService] Affiliate not found for link ${data.link_id}`)
      return null
    }

    if (affiliate.status !== 'active') {
      console.warn(`[AffiliateService] Affiliate ${affiliate.id} is not active. Status: ${affiliate.status}`)
      return null
    }

    // 2. Calculate Commission
    const rate = affiliate.commission_rate ?? 0.1 // Default 10% if missing
    const commissionAmount = Math.floor(data.order_amount * rate) // Integer math (cents) or float? Medusa usually uses cents/smallest unit.

    console.log(`[AffiliateService] Commission Calc: ${data.order_amount} * ${rate} = ${commissionAmount}`)

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
}

export default AffiliateService
