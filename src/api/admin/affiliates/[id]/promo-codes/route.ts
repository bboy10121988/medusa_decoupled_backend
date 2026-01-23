import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate";
import AffiliateService from "../../../../../modules/affiliate/service";

/**
 * GET - List promo codes for a specific affiliate with conversion stats
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const { id } = req.params;
    const promotionModuleService = req.scope.resolve(Modules.PROMOTION);
    const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE);

    try {
        // Verify affiliate exists
        const affiliate = await affiliateService.retrieveAffiliate(id);
        if (!affiliate) {
            return res.status(404).json({ message: "Affiliate not found" });
        }

        // List all promotions and filter by affiliate_id in metadata
        const [promotions] = await promotionModuleService.listAndCountPromotions(
            {},
            {
                relations: ["application_method"],
                take: 1000
            }
        );

        // Filter promotions belonging to this affiliate
        const affiliatePromotions = promotions.filter(
            (p: any) => p.metadata?.affiliate_id === id
        );

        // Get conversion stats for each promo code
        const promoCodesWithStats = await Promise.all(
            affiliatePromotions.map(async (p: any) => {
                // Query conversions using this promo code
                const conversions = await affiliateService.listAffiliateConversions({
                    affiliate_id: id,
                    promo_code: p.code,
                });

                const totalEarnings = conversions.reduce(
                    (sum: number, c: any) => sum + Number(c.commission || 0),
                    0
                );

                return {
                    id: p.id,
                    code: p.code,
                    discount_type: p.application_method?.type || "percentage",
                    discount_value: p.application_method?.value || 0,
                    commission_rate: p.metadata?.commission_rate || 0,
                    status: p.status,
                    used: p.used || 0,
                    limit: p.limit,
                    conversions_count: conversions.length,
                    total_earnings: totalEarnings,
                    created_at: p.created_at,
                };
            })
        );

        res.json({ promo_codes: promoCodesWithStats });
    } catch (error: any) {
        console.error("[Admin Promo Codes API] GET Error:", error);
        res.status(500).json({ message: error.message || "Failed to fetch promo codes" });
    }
}

/**
 * POST - Create a new promo code for an affiliate
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const { id } = req.params;
    const body = req.body as any;
    const promotionModuleService = req.scope.resolve(Modules.PROMOTION);
    const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE);

    try {
        // Verify affiliate exists
        const affiliate = await affiliateService.retrieveAffiliate(id);
        if (!affiliate) {
            return res.status(404).json({ message: "Affiliate not found" });
        }

        if (!body.code) {
            return res.status(400).json({ message: "Promo code is required" });
        }

        const promotion = await promotionModuleService.createPromotions({
            code: body.code.toUpperCase(),
            type: "standard",
            status: "active",
            is_automatic: false,
            application_method: {
                type: body.discount_type || "percentage",
                target_type: "order",
                allocation: "across",
                value: body.discount_value || 10,
            },
            ...(body.limit && { limit: Number(body.limit) }),
            metadata: {
                source: "affiliate_system",
                affiliate_id: id,
                affiliate_code: affiliate.code,
                affiliate_email: affiliate.email,
                commission_rate: Number(body.commission_rate) || 0.1,
                created_at: new Date().toISOString()
            }
        });

        res.status(201).json({
            message: "Promo code created successfully",
            promo_code: {
                id: promotion.id,
                code: promotion.code,
                discount_type: body.discount_type || "percentage",
                discount_value: body.discount_value || 10,
                commission_rate: Number(body.commission_rate) || 0.1,
                status: promotion.status,
            },
        });
    } catch (error: any) {
        console.error("[Admin Promo Codes API] POST Error:", error);

        // Handle duplicate code error
        if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
            return res.status(400).json({ message: "此折扣碼已存在，請使用其他代碼" });
        }

        res.status(500).json({ message: error.message || "Failed to create promo code" });
    }
}
