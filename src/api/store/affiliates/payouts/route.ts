import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../utils/affiliate-auth"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateAuth = getAffiliateFromRequest(req)
  if (!affiliateAuth) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  
  const settlements = await affiliateService.listAffiliateSettlements({
    affiliate_id: affiliateAuth.id
  })

  const affiliate = await affiliateService.retrieveAffiliate(affiliateAuth.id)

  const summary = {
    totalEarned: affiliate.total_earnings,
    totalSettled: settlements.filter(s => s.status === 'paid').reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    pendingSettlement: affiliate.balance,
    nextSettlementDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 25).toISOString() // Simplified
  }

  res.json({
    summary,
    settlements
  })
}
