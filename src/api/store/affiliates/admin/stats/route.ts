import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../../utils/affiliate-auth"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    // Auth Check
    const affiliateAuth = getAffiliateFromRequest(req)
    if (!affiliateAuth) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
    const currentAffiliate = await affiliateService.retrieveAffiliate(affiliateAuth.id)

    if (currentAffiliate.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" })
    }

    // 1. Get all affiliates to calculate totals
    const [affiliates, count] = await affiliateService.listAndCountAffiliates({}, { take: 99999 })

    const activeCount = affiliates.filter(a => a.status === 'active').length

    // 2. Aggregate Earnings
    const totalEarningsAllTime = affiliates.reduce((sum, aff) => sum + Number(aff.total_earnings || 0), 0)
    const currentPendingBalance = affiliates.reduce((sum, aff) => sum + Number(aff.balance || 0), 0)

    // Paid = All Time - Pending (roughly)
    const totalCommissionPaid = totalEarningsAllTime - currentPendingBalance

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
