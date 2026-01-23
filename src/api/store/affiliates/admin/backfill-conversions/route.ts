import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../../utils/affiliate-auth"

/**
 * POST - Backfill conversion records for historical orders with affiliate promo codes
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
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

        const query = req.scope.resolve("query")
        const promotionModuleService = req.scope.resolve(Modules.PROMOTION)

        // 1. Get all affiliate promotions (with affiliate_id in metadata)
        const [promotions] = await promotionModuleService.listAndCountPromotions(
            {},
            { take: 10000 }
        )

        const affiliatePromotions = promotions.filter(
            (p: any) => p.metadata?.source === "affiliate_system" && p.metadata?.affiliate_id
        )

        console.log(`[Backfill] Found ${affiliatePromotions.length} affiliate promotions`)

        // 2. Get all orders (we'll filter by promotion later)
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "total",
                "subtotal",
                "shipping_total",
                "discount_total",
                "currency_code",
                "created_at",
                "promotions.*"
            ],
            filters: {},
            pagination: { take: 10000 }
        })

        console.log(`[Backfill] Found ${orders.length} total orders`)

        const results: { order_id: string; promo_code: string; status: string; commission?: number }[] = []

        for (const order of orders) {
            if (!order.promotions || order.promotions.length === 0) continue

            for (const promotion of order.promotions) {
                const affiliateId = promotion.metadata?.affiliate_id
                const commissionRate = promotion.metadata?.commission_rate

                if (!affiliateId || !commissionRate) continue

                // Check if conversion already exists for this order
                const existingConversions = await affiliateService.listAffiliateConversions({
                    order_id: order.id
                })

                if (existingConversions.length > 0) {
                    results.push({
                        order_id: order.id,
                        promo_code: promotion.code,
                        status: 'skipped - conversion exists'
                    })
                    continue
                }

                // Check if affiliate exists and is active
                try {
                    const affiliate = await affiliateService.retrieveAffiliate(affiliateId)
                    if (!affiliate) {
                        results.push({
                            order_id: order.id,
                            promo_code: promotion.code,
                            status: 'skipped - affiliate not found'
                        })
                        continue
                    }

                    // Calculate commission
                    const orderSubtotalAfterDiscount = order.subtotal - order.discount_total
                    const commissionBase = orderSubtotalAfterDiscount - (order.shipping_total || 0)

                    if (commissionBase <= 0) {
                        results.push({
                            order_id: order.id,
                            promo_code: promotion.code,
                            status: 'skipped - commission base <= 0'
                        })
                        continue
                    }

                    const commission = Math.floor(commissionBase * Number(commissionRate))

                    // Create conversion record
                    await affiliateService.createAffiliateConversions({
                        affiliate_id: affiliateId,
                        order_id: order.id,
                        amount: commissionBase,
                        commission,
                        status: "captured", // Historical orders are already completed
                        source_type: "promo_code",
                        promo_code: promotion.code,
                        metadata: {
                            order_display_id: order.display_id,
                            currency_code: order.currency_code,
                            order_total: order.total,
                            discount_total: order.discount_total,
                            promotion_id: promotion.id,
                            commission_rate: commissionRate,
                            backfilled_at: new Date().toISOString(),
                            order_created_at: order.created_at
                        },
                    })

                    // Update affiliate earnings
                    const currentTotal = Number(affiliate.total_earnings || 0)
                    const currentBalance = Number(affiliate.balance || 0)

                    await affiliateService.updateAffiliates({
                        id: affiliateId,
                        total_earnings: currentTotal + commission,
                        balance: currentBalance + commission,
                    })

                    results.push({
                        order_id: order.id,
                        promo_code: promotion.code,
                        status: 'created',
                        commission
                    })

                    console.log(`[Backfill] Created conversion for order ${order.id}, promo ${promotion.code}, commission ${commission}`)

                } catch (error: any) {
                    results.push({
                        order_id: order.id,
                        promo_code: promotion.code,
                        status: `error: ${error.message}`
                    })
                }
            }
        }

        const created = results.filter(r => r.status === 'created').length
        const skipped = results.filter(r => r.status.startsWith('skipped')).length
        const errors = results.filter(r => r.status.startsWith('error')).length
        const totalCommission = results
            .filter(r => r.status === 'created')
            .reduce((sum, r) => sum + (r.commission || 0), 0)

        res.json({
            message: "Backfill completed",
            summary: {
                created,
                skipped,
                errors,
                total_orders_checked: orders.length,
                total_commission_backfilled: totalCommission
            },
            results
        })
    } catch (error: any) {
        console.error("[Backfill Conversions API] Error:", error)
        res.status(500).json({ message: error.message || "Failed to backfill conversions" })
    }
}
