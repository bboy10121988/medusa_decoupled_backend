import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { id } = req.params
  const { from, to } = req.query

  let startDate: Date
  let endDate: Date
  let days: number

  if (from || to) {
    startDate = from ? new Date(from as string) : new Date(0)
    endDate = to ? new Date(to as string) : new Date()
    // Calculate days for trend generation
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  } else {
    days = parseInt(req.query.days as string || '30', 10)
    endDate = new Date()
    startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
  }

  const [clicks, conversions] = await Promise.all([
    affiliateService.listAffiliateClicks({
      affiliate_id: id,
      created_at: { $gte: startDate, $lte: endDate }
    }, {
      relations: ['link']
    }),
    affiliateService.listAffiliateConversions({
      affiliate_id: id,
      created_at: { $gte: startDate, $lte: endDate }
    }, {
      relations: ['link']
    })
  ])

  // Aggregate data
  const totalClicks = clicks.length
  const totalConversions = conversions.length
  const totalRevenue = conversions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const totalCommission = conversions.reduce((sum, c) => sum + (Number(c.commission) || 0), 0)

  // Calculate linkStats
  const linkStats: Record<string, { clicks: number, conversions: number, revenue: number, commission: number }> = {}

  clicks.forEach(c => {
    const linkId = c.link?.id
    if (linkId) {
      if (!linkStats[linkId]) {
        linkStats[linkId] = { clicks: 0, conversions: 0, revenue: 0, commission: 0 }
      }
      linkStats[linkId].clicks++
    }
  })

  conversions.forEach(c => {
    const linkId = c.link?.id
    if (linkId) {
      if (!linkStats[linkId]) {
        linkStats[linkId] = { clicks: 0, conversions: 0, revenue: 0, commission: 0 }
      }
      linkStats[linkId].conversions++
      linkStats[linkId].revenue += (Number(c.amount) || 0)
      linkStats[linkId].commission += (Number(c.commission) || 0)
    }
  })

  // Generate trend data
  const trend: any[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

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
    period: from || to ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}` : `Last ${days} days`,
    totalClicks,
    totalConversions,
    totalRevenue,
    totalCommission,
    trend,
    linkStats
  })
}
