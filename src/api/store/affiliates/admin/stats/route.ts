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

    const { from, to } = req.query as any

    // 1. Get all affiliates basic counts
    const [affiliates, count] = await affiliateService.listAndCountAffiliates({}, { take: 99999 })
    const activeCount = affiliates.filter(a => a.status === 'active').length

    // 2. Aggregate Earnings based on date range or lifetime
    let totalEarningsForPeriod = 0
    let totalCommissionPaid = 0
    let totalCommissionPending = 0

    if (from || to) {
        // Filtered performance
        const filter: any = {}
        if (from) filter.created_at = { ...filter.created_at, $gte: new Date(from as string) }
        if (to) filter.created_at = { ...filter.created_at, $lte: new Date(to as string) }

        const conversions = await affiliateService.listAffiliateConversions(filter, {})

        totalEarningsForPeriod = conversions.reduce((sum, conv) => sum + Number(conv.commission || 0), 0)
        totalCommissionPaid = conversions
            .filter(c => c.status === 'captured' || c.status === 'paid' || c.status === 'confirmed')
            .reduce((sum, conv) => sum + Number(conv.commission || 0), 0)
        totalCommissionPending = conversions
            .filter(c => c.status === 'pending')
            .reduce((sum, conv) => sum + Number(conv.commission || 0), 0)
    } else {
        // Lifetime
        totalEarningsForPeriod = affiliates.reduce((sum, aff) => sum + Number(aff.total_earnings || 0), 0)
        totalCommissionPending = affiliates.reduce((sum, aff) => sum + Number(aff.balance || 0), 0)
        totalCommissionPaid = totalEarningsForPeriod - totalCommissionPending
    }

    res.json({
        stats: {
            active_affiliates: activeCount,
            total_affiliates: count,
            total_commission_all_time: totalEarningsForPeriod,
            total_commission_pending: totalCommissionPending,
            total_commission_paid: totalCommissionPaid
        }
    })
}
