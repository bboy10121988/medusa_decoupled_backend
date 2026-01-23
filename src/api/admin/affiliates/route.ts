import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../modules/affiliate"
import AffiliateService from "../../../modules/affiliate/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)

  const { skip, take, from, to } = req.query as any

  // 1. Fetch Affiliates (All of them, with pagination, NOT filtering by created_at)
  const [affiliates, count] = await affiliateService.listAndCountAffiliates(
    {},
    {
      skip: Number(skip) || 0,
      take: Number(take) || 20,
      order: { created_at: "DESC" }
    }
  )

  // 2. Fetch conversions for these 20 affiliates (both lifetime and period if range given)
  const affiliateIds = affiliates.map(a => a.id)

  // Period filter
  const periodFilter: any = { affiliate_id: affiliateIds }
  if (from) periodFilter.created_at = { ...periodFilter.created_at, $gte: new Date(from as string) }
  if (to) periodFilter.created_at = { ...periodFilter.created_at, $lte: new Date(to as string) }

  // Lifetime filter (all conversions for these affiliates)
  const lifetimeFilter: any = { affiliate_id: affiliateIds }

  const [periodConversions, lifetimeConversions] = await Promise.all([
    (from || to) ? affiliateService.listAffiliateConversions(periodFilter, {}) : Promise.resolve([]),
    affiliateService.listAffiliateConversions(lifetimeFilter, {})
  ])

  // 3. Map stats back to affiliates
  const affiliatesWithStats = affiliates.map(aff => {
    const affLifetimeConversions = lifetimeConversions.filter(c => c.affiliate_id === aff.id)
    const affPeriodConversions = (from || to)
      ? periodConversions.filter(c => c.affiliate_id === aff.id)
      : affLifetimeConversions

    return {
      ...aff,
      // Calculate stats from conversions
      total_sales: affLifetimeConversions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
      period_sales: affPeriodConversions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
      period_commission: affPeriodConversions.reduce((sum, c) => sum + (Number(c.commission) || 0), 0),
      // captured_balance and pending_balance are also useful for the list
      captured_balance: affLifetimeConversions
        .filter(c => c.status === 'captured' || c.status === 'confirmed' || c.status === 'paid')
        .reduce((sum, c) => sum + (Number(c.commission) || 0), 0),
      pending_balance: affLifetimeConversions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (Number(c.commission) || 0), 0),
    }
  })

  res.json({
    affiliates: affiliatesWithStats,
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
