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
  
  const links = await affiliateService.listAffiliateLinks({
    affiliate_id: affiliateAuth.id
  })

  res.json({ links })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateAuth = getAffiliateFromRequest(req)
  if (!affiliateAuth) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { url, code } = req.body as any

  if (!url) {
    return res.status(400).json({ message: "URL is required" })
  }

  // If code is provided, check uniqueness, else generate one
  let linkCode = code
  if (!linkCode) {
    linkCode = Math.random().toString(36).substring(2, 10)
  } else {
    const existing = await affiliateService.listAffiliateLinks({ code: linkCode })
    if (existing.length > 0) {
      return res.status(400).json({ message: "Code already exists" })
    }
  }

  const link = await affiliateService.createAffiliateLinks({
    affiliate_id: affiliateAuth.id,
    url,
    code: linkCode,
    clicks: 0,
    conversions: 0
  })

  res.json({ link })
}
