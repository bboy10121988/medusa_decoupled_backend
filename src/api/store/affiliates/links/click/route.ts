import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { linkId, affiliateId } = req.body as any

  if (!linkId) {
    return res.status(400).json({ message: "Link ID is required" })
  }

  // Find the link
  const links = await affiliateService.listAffiliateLinks({ id: linkId })
  if (links.length === 0) {
    return res.status(404).json({ message: "Link not found" })
  }
  const link = links[0]

  // Record click
  await affiliateService.createAffiliateClicks({
    affiliate_id: affiliateId || link.affiliate.id,
    link_id: link.id,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    metadata: {
      referrer: req.get('Referer')
    }
  })

  // Update link stats
  await affiliateService.updateAffiliateLinks({
    id: link.id,
    clicks: (link.clicks || 0) + 1
  })

  res.json({ success: true })
}
