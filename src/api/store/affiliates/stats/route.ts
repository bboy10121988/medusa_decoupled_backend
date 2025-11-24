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
  const days = parseInt(req.query.days as string || '7', 10)
  
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Fetch data (This is not optimal for large datasets, but works for now)
  // Ideally we should use a custom query with aggregation
  const [clicks, conversions] = await Promise.all([
    affiliateService.listAffiliateClicks({
      affiliate_id: affiliateAuth.id,
      created_at: { $gte: startDate }
    }),
    affiliateService.listAffiliateConversions({
      affiliate_id: affiliateAuth.id,
      created_at: { $gte: startDate }
    })
  ])

  // Aggregate data
  const totalClicks = clicks.length
  const totalConversions = conversions.length
  const totalRevenue = conversions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const totalCommission = conversions.reduce((sum, c) => sum + (Number(c.commission) || 0), 0)

  // Generate trend data (simplified)
  const trend: any[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    
    // Filter for this day
    const dayClicks = clicks.filter(c => c.created_at.toISOString().startsWith(dateStr)).length
    const dayConversions = conversions.filter(c => c.created_at.toISOString().startsWith(dateStr))
    
    trend.push({
      date: dateStr,
      clicks: dayClicks,
      conversions: dayConversions.length,
      revenue: dayConversions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
      commission: dayConversions.reduce((sum, c) => sum + (Number(c.commission) || 0), 0)
    })
  }

  res.json({
    period: `Last ${days} days`,
    totalClicks,
    totalConversions,
    totalRevenue,
    totalCommission,
    trend
  })
}
