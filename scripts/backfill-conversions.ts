/**
 * Backfill script for affiliate promo code conversions
 * Run with: npx ts-node scripts/backfill-conversions.ts
 */

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

async function main() {
    // Initialize Medusa container
    const { container } = await import("@medusajs/medusa")

    console.log("[Backfill] Starting conversion backfill...")

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const promotionModuleService = container.resolve(Modules.PROMOTION)

    // Import affiliate module
    const { AFFILIATE_MODULE } = await import("../src/modules/affiliate")
    const affiliateService = container.resolve(AFFILIATE_MODULE)

    // 1. Get all affiliate promotions
    const [promotions] = await promotionModuleService.listAndCountPromotions(
        {},
        { take: 10000 }
    )

    const affiliatePromotions = promotions.filter(
        (p: any) => p.metadata?.source === "affiliate_system" && p.metadata?.affiliate_id
    )

    console.log(`[Backfill] Found ${affiliatePromotions.length} affiliate promotions`)

    // 2. Get all orders
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

    let created = 0
    let skipped = 0
    let errors = 0

    for (const order of orders) {
        if (!order.promotions || order.promotions.length === 0) continue

        for (const promotion of order.promotions) {
            const affiliateId = promotion.metadata?.affiliate_id
            const commissionRate = promotion.metadata?.commission_rate

            if (!affiliateId || !commissionRate) continue

            try {
                // Check if conversion already exists
                const existingConversions = await affiliateService.listAffiliateConversions({
                    order_id: order.id
                })

                if (existingConversions.length > 0) {
                    console.log(`[Backfill] Skipping order ${order.id} - conversion exists`)
                    skipped++
                    continue
                }

                // Get affiliate
                const affiliate = await affiliateService.retrieveAffiliate(affiliateId)
                if (!affiliate) {
                    console.log(`[Backfill] Skipping order ${order.id} - affiliate not found`)
                    skipped++
                    continue
                }

                // Calculate commission
                const orderSubtotalAfterDiscount = order.subtotal - order.discount_total
                const commissionBase = orderSubtotalAfterDiscount - (order.shipping_total || 0)

                if (commissionBase <= 0) {
                    console.log(`[Backfill] Skipping order ${order.id} - commission base <= 0`)
                    skipped++
                    continue
                }

                const commission = Math.floor(commissionBase * Number(commissionRate))

                // Create conversion
                await affiliateService.createAffiliateConversions({
                    affiliate_id: affiliateId,
                    order_id: order.id,
                    amount: commissionBase,
                    commission,
                    status: "captured",
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

                console.log(`[Backfill] Created conversion for order ${order.id}, promo ${promotion.code}, commission ${commission}`)
                created++

            } catch (error: any) {
                console.error(`[Backfill] Error processing order ${order.id}:`, error.message)
                errors++
            }
        }
    }

    console.log(`\n[Backfill] Complete!`)
    console.log(`  Created: ${created}`)
    console.log(`  Skipped: ${skipped}`)
    console.log(`  Errors: ${errors}`)

    process.exit(0)
}

main().catch(err => {
    console.error("[Backfill] Fatal error:", err)
    process.exit(1)
})
