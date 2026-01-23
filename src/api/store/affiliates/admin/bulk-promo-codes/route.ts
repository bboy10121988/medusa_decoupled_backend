import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../../utils/affiliate-auth"

/**
 * POST - Bulk create promo codes for all active affiliates that don't have one
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

        const promotionModuleService = req.scope.resolve(Modules.PROMOTION)

        // Get parameters from request body
        const body = req.body as any
        const discountValue = body?.discount_value || 10
        const commissionRate = body?.commission_rate || 0.1

        // Get all active affiliates
        const affiliates = await affiliateService.listAffiliates({ status: 'active' })

        // Get all existing promotions
        const [existingPromos] = await promotionModuleService.listAndCountPromotions(
            {},
            { take: 10000 }
        )

        // Find affiliates that have promo codes
        const affiliatesWithPromos = new Set(
            existingPromos
                .filter((p: any) => p.metadata?.affiliate_id)
                .map((p: any) => p.metadata.affiliate_id)
        )

        // Helper function to generate random code
        const generateRandomCode = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            let code = ''
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return code
        }

        const results: { affiliate_id: string; code: string; status: string }[] = []

        for (const affiliate of affiliates) {
            // Skip if affiliate already has a promo code
            if (affiliatesWithPromos.has(affiliate.id)) {
                results.push({
                    affiliate_id: affiliate.id,
                    code: '',
                    status: 'skipped - already has promo code'
                })
                continue
            }

            // Retry up to 3 times in case of code collision
            let retries = 3
            let promoCode = ''
            let success = false

            while (retries > 0 && !success) {
                try {
                    promoCode = generateRandomCode()

                    await promotionModuleService.createPromotions({
                    code: promoCode,
                    type: "standard",
                    status: "active",
                    is_automatic: false,
                    application_method: {
                        type: "percentage",
                        target_type: "order",
                        allocation: "across",
                        value: discountValue,
                    },
                    metadata: {
                        source: "affiliate_system",
                        affiliate_id: affiliate.id,
                        affiliate_code: affiliate.code,
                        affiliate_email: affiliate.email,
                        commission_rate: commissionRate,
                        created_at: new Date().toISOString(),
                        is_bulk_created: true
                    },
                    campaign: {
                        name: `Affiliate Campaign - ${promoCode}`,
                        campaign_identifier: `AFF-${promoCode}`,
                        budget: {
                            type: "usage",
                            limit: 100000
                        }
                    }
                })

                    success = true
                    results.push({
                        affiliate_id: affiliate.id,
                        code: promoCode,
                        status: 'created'
                    })

                    console.log(`[Bulk Promo] Created code ${promoCode} for affiliate ${affiliate.id}`)
                } catch (error: any) {
                    retries--
                    // If it's a duplicate error and we have retries left, continue
                    if (retries > 0 && (error.message?.includes('unique') || error.message?.includes('duplicate'))) {
                        console.log(`[Bulk Promo] Code collision, retrying... (${retries} left)`)
                        continue
                    }
                    results.push({
                        affiliate_id: affiliate.id,
                        code: '',
                        status: `error: ${error.message}`
                    })
                }
            }
        }

        const created = results.filter(r => r.status === 'created').length
        const skipped = results.filter(r => r.status.startsWith('skipped')).length
        const errors = results.filter(r => r.status.startsWith('error')).length

        res.json({
            message: `Bulk promo code creation completed`,
            summary: { created, skipped, errors, total: affiliates.length },
            results
        })
    } catch (error: any) {
        console.error("[Bulk Promo Codes API] Error:", error)
        res.status(500).json({ message: error.message || "Failed to create bulk promo codes" })
    }
}
