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

  console.log("[Affiliate] Listing links for affiliate:", affiliateAuth.id)

  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)

  const links = await affiliateService.listAffiliateLinks({
    affiliate_id: affiliateAuth.id
  })

  console.log("[Affiliate] Found links:", links.length)

  const mappedLinks = links.map(l => {
    console.log(`[Affiliate Link DEBUG] Link ${l.code} created_at:`, l.created_at)
    return {
      id: l.id,
      name: (l.metadata as any)?.name || l.code,
      code: l.code, // Ensure code is returned
      url: l.url,
      createdAt: l.created_at,
      clicks: l.clicks,
      conversions: l.conversions,
      metadata: l.metadata
    }
  })

  res.json({ links: mappedLinks })
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
  const { url, code, metadata } = req.body as any

  console.log("[Affiliate] Creating link:", { affiliate_id: affiliateAuth.id, url, code, metadata })

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
    conversions: 0,
    metadata
  })

  console.log("[Affiliate] Link created:", link.id)

  res.json({ link })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateAuth = getAffiliateFromRequest(req)
  if (!affiliateAuth) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { id } = req.query
  if (!id) {
    return res.status(400).json({ message: "ID is required" })
  }

  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)

  // Verify ownership
  const links = await affiliateService.listAffiliateLinks({
    id: id as string,
    affiliate_id: affiliateAuth.id
  })

  if (links.length === 0) {
    return res.status(404).json({ message: "Link not found or access denied" })
  }

  await affiliateService.deleteAffiliateLinks([id as string])

  res.json({ message: "Deleted" })
}
