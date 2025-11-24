import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../modules/affiliate"
import AffiliateService from "../../../modules/affiliate/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  
  const { skip, take } = req.query
  
  const [affiliates, count] = await affiliateService.listAndCountAffiliates(
    {},
    {
      skip: Number(skip) || 0,
      take: Number(take) || 20,
      order: { created_at: "DESC" }
    }
  )

  res.json({
    affiliates,
    count,
    offset: Number(skip) || 0,
    limit: Number(take) || 20
  })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const body = req.body as any

  // Admin can create affiliate directly
  const affiliate = await affiliateService.createAffiliates(body)

  res.json({ affiliate })
}
