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
  
  const conversions = await affiliateService.listAffiliateConversions({
    affiliate_id: affiliateAuth.id
  }, {
    relations: ["link"]
  })

  // Map to frontend expected format
  const orders = conversions.map(c => ({
    id: c.order_id,
    clickId: "N/A", 
    linkId: c.link?.id,
    linkName: c.link?.code, 
    orderValue: c.amount,
    commission: c.commission,
    customerEmail: (c.metadata as any)?.customer_email,
    createdAt: c.created_at,
    status: c.status
  }))

  const summary = {
    totalOrders: orders.length,
    totalValue: orders.reduce((sum, o) => sum + Number(o.orderValue), 0),
    totalCommission: orders.reduce((sum, o) => sum + Number(o.commission), 0),
    pendingCommission: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + Number(o.commission), 0)
  }

  res.json({
    summary,
    orders
  })
}
