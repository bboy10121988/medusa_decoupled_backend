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
  
  const affiliate = await affiliateService.retrieveAffiliate(affiliateAuth.id)

  res.json({
    id: affiliate.id,
    email: affiliate.email,
    first_name: affiliate.first_name,
    last_name: affiliate.last_name,
    code: affiliate.code,
    status: affiliate.status,
    balance: affiliate.balance,
    total_earnings: affiliate.total_earnings,
    settings: affiliate.settings
  })
}
