import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../utils/affiliate-auth"

export async function GET(
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

        // List all affiliates
        const [affiliates, count] = await affiliateService.listAndCountAffiliates({}, {
            take: 100,
            order: { created_at: 'DESC' }
        })

        // Fetch all conversions for these affiliates efficiently
        const affiliateIds = affiliates.map(a => a.id)
        let allConversions: any[] = []
        if (affiliateIds.length > 0) {
            allConversions = await affiliateService.listAffiliateConversions(
                { affiliate_id: affiliateIds },
                { take: 99999 }
            )
        }



        // Calculate total_sales, captured_balance, and pending_balance
        // Fetch all cancellations and settlements to exclude/include correctly
        // We already fetch conversions. Now we need the ACTUAL ORDER STATUS.
        const orderIds = allConversions.map(c => c.order_id).filter(id => !!id)
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
                console.error('[Admin List API] Failed to fetch orders via query.graph:', e)
            }
        }

        // Calculate total_sales, captured_balance, and pending_balance
        const affiliatesWithSales = affiliates.map(aff => {
            const conversions = allConversions.filter(c => c.affiliate_id === aff.id)

            let total_sales = 0
            let captured_balance = 0
            let pending_balance = 0

            conversions.forEach((c: any) => {
                // If conversion is explicitly cancelled in affiliate system, ignore it matches
                if (c.status === 'cancelled') return

                const order = ordersMap.get(c.order_id)
                // If order is missing, fall back to conversion status (safety)

                // Logic Update: Check payment_collections for 'captured' or 'completed'
                const paymentCollections = order?.payment_collections || []
                const isOrderCaptured = paymentCollections.some((pc: any) => pc.status === 'captured' || pc.status === 'completed')

                const isOrderCancelled = order?.status === 'canceled'

                // If real order is cancelled, ignore
                if (isOrderCancelled) return

                const amount = Number(c.amount || 0)
                const commission = Number(c.commission || 0)

                // Total Sales
                total_sales += amount

                // Bucketing
                if (isOrderCaptured) {
                    captured_balance += commission
                } else if (c.status === 'paid') {
                    // If it's already marked paid/settled in affiliate system, it doesn't count as pending OR captured usually? 
                    // Or maybe "Captured" means "Available to be Paid"? 
                    // Usually: Pending -> Captured/Confirmed -> Settle -> Paid.
                    // The user asked: "可結算" (Captured) is sum of captured. "累積收益" (Accumulated) is sum of settled.
                    // IMPORTANT: If status is 'paid', it is NO LONGER "Captured/Withdrawable".
                    // So strictly check:
                    // Pending Balance: Order !captured
                    // Captured Balance: Order captured AND Conversion != paid
                } else {
                    // Default to pending if not captured
                    pending_balance += commission
                }
            })

            // Double check: If conversion is 'paid', it shouldn't show in Captured Balance (already withdrawn).
            // But User said: "可結算就是captured經過計算的總和" (Captured is sum of captured orders).
            // And "累積收益就是已結算的總和" (Accumulated is sum of settled).
            // So if I have settled it, it enters Accumulated. Does it leave Captured? Yes, normally.
            // So Captured Balance = (Order Captured) MINUS (Already Settled).
            // Let's refine logical check.

            // Re-loop for clarity
            total_sales = 0
            captured_balance = 0
            pending_balance = 0

            conversions.forEach((c: any) => {
                if (c.status === 'cancelled') return
                const order = ordersMap.get(c.order_id)
                if (order?.status === 'canceled') return

                total_sales += Number(c.amount || 0)
                const commission = Number(c.commission || 0)

                // If conversion is already PAID (Settled), it is NOT in Pending or Captured balance.
                if (c.status === 'paid') {
                    return
                }

                const paymentCollections = order?.payment_collections || []
                const isCaptured = paymentCollections.some((pc: any) => pc.status === 'captured' || pc.status === 'completed')

                if (isCaptured) {
                    captured_balance += commission
                } else {
                    pending_balance += commission
                }
            })
            return {
                ...aff,
                total_sales,
                captured_balance,
                pending_balance,
                balance: captured_balance
            }
        })

        res.json({
            affiliates: affiliatesWithSales,
            count,
            offset: 0,
            limit: 100
        })
    } catch (error) {
        console.error('[Admin List API] Error:', error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}
