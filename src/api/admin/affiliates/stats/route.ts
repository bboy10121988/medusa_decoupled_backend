import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)

    // 1. Get all affiliates to calculate totals
    // Ideally, use a direct DB query or count method, but list is okay for MVP
    const [affiliates, count] = await affiliateService.listAndCountAffiliates({}, { take: 99999 })

    const activeCount = affiliates.filter(a => a.status === 'active').length

    // 2. Aggregate Earnings
    let totalRevenue = 0 // Not tracked directly on affiliate yet, usually sum of conversions
    let totalCommissionPaid = 0 // Can be derived from paid settlements
    let totalCommissionPending = 0 // Sum of balance

    // To get Total Revenue, we need to sum up conversions amounts
    // Since we didn't fetch relations, let's just use what we have on Affiliate model if possible
    // Model has 'total_earnings' which is commissions. 

    // Let's iterate if we want more accurate data or just use the summary fields
    const totalEarningsAllTime = affiliates.reduce((sum, aff) => sum + Number(aff.total_earnings || 0), 0)
    const currentPendingBalance = affiliates.reduce((sum, aff) => sum + Number(aff.balance || 0), 0)

    // Paid = All Time - Pending (roughly)
    totalCommissionPaid = totalEarningsAllTime - currentPendingBalance

    res.json({
        stats: {
            active_affiliates: activeCount,
            total_affiliates: count,
            total_commission_all_time: totalEarningsAllTime,
            total_commission_pending: currentPendingBalance,
            total_commission_paid: totalCommissionPaid
        }
    })
}
