import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { id } = req.params

  const affiliate = await affiliateService.retrieveAffiliate(id, {
    relations: ["links", "settlements", "conversions"]
  })

  res.json({ affiliate })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { id } = req.params
  const body = req.body as any

  const affiliate = await affiliateService.updateAffiliates({
    id,
    ...body
  })

  res.json({ affiliate })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { id } = req.params

  await affiliateService.deleteAffiliates(id)

  res.json({
    id,
    object: "affiliate",
    deleted: true
  })
}
