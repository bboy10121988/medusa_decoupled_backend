import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { AFFILIATE_MODULE } from "../../../../modules/affiliate";
import AffiliateService from "../../../../modules/affiliate/service";
import { getAffiliateFromRequest } from "../../../../utils/affiliate-auth";

// GET - 取得我的折扣碼
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const affiliateAuth = getAffiliateFromRequest(req);
        if (!affiliateAuth) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE);
        const promotionModuleService = req.scope.resolve(Modules.PROMOTION);

        // 查詢所有 Promotions
        const [promotions] = await promotionModuleService.listAndCountPromotions(
            {},
            {
                take: 1000,
                relations: ["application_method", "campaign"],
            }
        );

        // 過濾出屬於此聯盟會員的折扣碼
        const myPromotions = promotions.filter(
            (p: any) =>
                p.metadata?.source === "affiliate_system" &&
                p.metadata?.affiliate_id === affiliateAuth.id
        );

        // 查詢每個折扣碼的轉換統計
        const promoCodesWithStats = await Promise.all(
            myPromotions.map(async (p: any) => {
                // 查詢使用此折扣碼的轉換記錄
                const conversions = await affiliateService.listAffiliateConversions(
                    {
                        affiliate_id: affiliateAuth.id,
                        promo_code: p.code,
                    },
                    { take: 9999 }
                );

                const totalEarnings = conversions.reduce(
                    (sum: number, c: any) => sum + Number(c.commission || 0),
                    0
                );

                const confirmedEarnings = conversions
                    .filter((c: any) => c.status === "captured" || c.status === "paid")
                    .reduce((sum: number, c: any) => sum + Number(c.commission || 0), 0);

                return {
                    id: p.id,
                    code: p.code,
                    discount_type: p.application_method?.type,
                    discount_value: p.application_method?.value,
                    commission_rate: p.metadata?.commission_rate,
                    status: p.status,
                    used: p.used || 0,
                    limit: p.limit,
                    total_conversions: conversions.length,
                    total_earnings: totalEarnings,
                    confirmed_earnings: confirmedEarnings,
                    created_at: p.metadata?.created_at,
                    ends_at: p.campaign?.ends_at || null,
                };
            })
        );

        res.json({
            promo_codes: promoCodesWithStats,
        });
    } catch (error: any) {
        console.error("[Affiliate Promo Code API] Error:", error);
        res.status(400).json({ message: error.message || "Failed to get promo codes" });
    }
}
