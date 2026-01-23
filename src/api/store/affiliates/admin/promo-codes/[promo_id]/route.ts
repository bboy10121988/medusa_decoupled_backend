import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../../../../modules/affiliate"
import AffiliateService from "../../../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../../../utils/affiliate-auth"

/**
 * PUT - Update a promo code
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
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

        const { promo_id } = req.params
        const body = req.body as any
        const promotionModuleService = req.scope.resolve(Modules.PROMOTION) as any

        // Find the promotion
        const [promotions] = await promotionModuleService.listAndCountPromotions(
            { id: promo_id },
            { relations: ["application_method", "campaign"] }
        )

        if (!promotions || promotions.length === 0) {
            return res.status(404).json({ message: "Promotion not found" })
        }

        const promotion = promotions[0] as any

        // Verify it's an affiliate promo code
        if (promotion.metadata?.source !== "affiliate_system") {
            return res.status(400).json({ message: "This is not an affiliate promo code" })
        }

        // Build update object for promotion
        const promotionUpdate: any = { id: promo_id }

        // Update status if provided
        if (body.status !== undefined) {
            promotionUpdate.status = body.status
        }

        // Update metadata if commission_rate is provided
        if (body.commission_rate !== undefined) {
            promotionUpdate.metadata = {
                ...promotion.metadata,
                commission_rate: Number(body.commission_rate)
            }
        }

        // Update application method if discount is provided
        if (body.discount_type !== undefined || body.discount_value !== undefined) {
            const currentAppMethod = promotion.application_method
            if (currentAppMethod) {
                await promotionModuleService.updateApplicationMethods({
                    id: currentAppMethod.id,
                    type: body.discount_type || currentAppMethod.type,
                    value: body.discount_value !== undefined ? Number(body.discount_value) : currentAppMethod.value,
                })
            }
        }

        // Update promotion if there are changes
        if (promotionUpdate.metadata || promotionUpdate.status) {
            await promotionModuleService.updatePromotions(promotionUpdate)
        }

        // Update campaign if ends_at is provided
        if (body.ends_at !== undefined && promotion.campaign) {
            await promotionModuleService.updateCampaigns({
                id: promotion.campaign.id,
                ends_at: body.ends_at ? new Date(body.ends_at) : null
            })
        }

        res.json({
            message: "Promo code updated successfully",
            promo_code: {
                id: promo_id,
                code: promotion.code,
                discount_type: body.discount_type || promotion.application_method?.type,
                discount_value: body.discount_value !== undefined ? body.discount_value : promotion.application_method?.value,
                commission_rate: body.commission_rate !== undefined ? body.commission_rate : promotion.metadata?.commission_rate,
                ends_at: body.ends_at !== undefined ? body.ends_at : promotion.campaign?.ends_at,
                status: body.status !== undefined ? body.status : promotion.status,
            },
        })
    } catch (error: any) {
        console.error("[Store Admin Promo Codes API] PUT Error:", error)
        res.status(500).json({ message: error.message || "Failed to update promo code" })
    }
}
