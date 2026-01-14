import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../../../modules/affiliate"
import AffiliateService from "../../../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../../../utils/affiliate-auth"

export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    try {
        const affiliateAuth = getAffiliateFromRequest(req)
        if (!affiliateAuth) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
        const currentAffiliate = await affiliateService.retrieveAffiliate(affiliateAuth.id)

        // Admin Role Check
        if (currentAffiliate.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access required" })
        }

        const { id } = req.params
        const targetAffiliate = await affiliateService.retrieveAffiliate(id)

        // DYNAMIC CALCULATION (Robust Logic)
        // 1. Fetch conversions
        const conversions = await affiliateService.listAffiliateConversions({
            affiliate_id: id
        }, { take: 99999 })

        // 2. Fetch associated orders
        const orderIds = conversions.map(c => c.order_id).filter(id => !!id) as string[]
        const ordersMap = new Map<string, any>()

        if (orderIds.length > 0) {
            try {
                const query = req.scope.resolve("query")
                const { data: orders } = await query.graph({
                    entity: "order",
                    fields: ["id", "status", "payment_status", "payment_collections.status"],
                    filters: {
                        id: orderIds
                    }
                })
                orders.forEach((o: any) => ordersMap.set(o.id, o))
            } catch (e) {
                console.error('[Admin Settle API] Failed to fetch orders:', e)
            }
        }

        // 3. Identify Settlable Conversions
        const settlableConversions: any[] = []
        let settlableAmount = 0

        conversions.forEach((c: any) => {
            if (c.status === 'paid' || c.status === 'cancelled') return

            const order = ordersMap.get(c.order_id)
            if (order?.status === 'canceled') return

            const isCaptured = (order?.payment_collections || []).some((pc: any) => pc.status === 'captured' || pc.status === 'completed')

            if (isCaptured) {
                settlableConversions.push(c)
                settlableAmount += Number(c.commission || 0)
            }
        })

        if (settlableAmount <= 0) {
            return res.status(400).json({ message: "No captured balance to settle (Amount is 0)" })
        }

        // 4. Create settlement record
        const settlement = await affiliateService.createAffiliateSettlements({
            affiliate_id: id,
            amount: settlableAmount,
            currency_code: "TWD",
            status: "paid",
            period_end: new Date(),
            metadata: {
                settled_by: "affiliate_manager_action",
                manager_id: currentAffiliate.id,
                settled_at: new Date().toISOString()
            }
        })

        // 5. Update identified conversions to 'paid'
        if (settlableConversions.length > 0) {
            await affiliateService.updateAffiliateConversions(
                settlableConversions.map(c => ({
                    id: c.id,
                    status: "paid" as any,
                    metadata: {
                        ...(c.metadata || {}) as any,
                        settlement_id: settlement.id,
                        paid_at: new Date().toISOString()
                    }
                }))
            )
        }

        // 6. Reset affiliate balance in DB (Clean slate for legacy data)
        await affiliateService.updateAffiliates({
            id,
            balance: 0
        })

        res.json({
            message: "Settlement successful",
            settlement,
            conversions_updated: settlableConversions.length,
            amount: settlableAmount
        })
    } catch (error: any) {
        console.error('[Admin Settle API] Error:', error)
        res.status(400).json({ message: error.message || "Settlement failed" })
    }
}
