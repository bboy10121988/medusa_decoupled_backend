import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { linkId, affiliateId, code } = req.body as any

  console.log("[Affiliate Click DEBUG] Received click request:", { linkId, affiliateId, code, ip: req.ip })

  if (!linkId && !code) {
    console.log("[Affiliate Click DEBUG] Missing linkId AND code")
    return res.status(400).json({ message: "Link ID or Code is required" })
  }

  // Find the link
  const query: any = {}
  if (linkId) query.id = linkId
  if (code) query.code = code

  console.log("[Affiliate Click DEBUG] Querying link with:", query)

  const links = await affiliateService.listAffiliateLinks(query, { relations: ['affiliate'] })
  console.log("[Affiliate Click DEBUG] Found links:", links.length)

  if (links.length === 0) {
    console.log("[Affiliate Click DEBUG] Link NOT found")
    return res.status(404).json({ message: "Link not found" })
  }
  const link = links[0]

  console.log("[Affiliate Click DEBUG] Recording click for link:", link.id)

  // Record click
  try {
    const click = await affiliateService.createAffiliateClicks({
      affiliate_id: affiliateId || link.affiliate?.id,
      link_id: link.id,
      ip: req.ip as string,
      user_agent: req.get('User-Agent'),
      metadata: {
        referrer: req.get('Referer')
      }
    })
    console.log("[Affiliate Click DEBUG] Click recorded:", click.id)
  } catch (e) {
    console.error("[Affiliate Click DEBUG] Error creating click record:", e)
  }

  // Update link stats
  try {
    const newCount = (link.clicks || 0) + 1
    console.log("[Affiliate Click DEBUG] Updating link clicks to:", newCount)
    await affiliateService.updateAffiliateLinks({
      id: link.id,
      clicks: newCount
    })
  } catch (e) {
    console.error("[Affiliate Click DEBUG] Error updating link stats:", e)
  }

  res.json({ success: true })
}
