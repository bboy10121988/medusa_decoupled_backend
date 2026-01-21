import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate";
import AffiliateService from "../../../../../modules/affiliate/service";
import { getAffiliateFromRequest } from "../../../../../utils/affiliate-auth";

// POST - 建立折扣碼
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        // 驗證管理員權限
        const affiliateAuth = getAffiliateFromRequest(req);
        if (!affiliateAuth) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE);
        const currentAffiliate = await affiliateService.retrieveAffiliate(affiliateAuth.id);

        if (currentAffiliate.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admin access required" });
        }

        // 取得請求參數
        const {
            affiliate_id,        // 目標聯盟會員 ID
            code,                // 折扣碼
            discount_type,       // "percentage" | "fixed"
            discount_value,      // 折扣值
            commission_rate,     // 佣金比例 (0.08 = 8%)
            limit,               // 使用次數上限 (可選)
            starts_at,           // 開始日期 (可選)
            ends_at,             // 結束日期 (可選)
        } = req.body as any;

        if (!affiliate_id || !code || !discount_type || discount_value === undefined || !commission_rate) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // 驗證目標聯盟會員存在
        const targetAffiliate = await affiliateService.retrieveAffiliate(affiliate_id);
        if (!targetAffiliate) {
            return res.status(404).json({ message: "Affiliate not found" });
        }

        // 使用 Medusa Promotion Module 建立折扣碼
        const promotionModuleService = req.scope.resolve(Modules.PROMOTION);

        const promotion = await promotionModuleService.createPromotions({
            code: code.toUpperCase(),
            type: "standard",
            status: "active",
            is_automatic: false,
            application_method: {
                type: discount_type,
                target_type: "order",
                value: discount_value,
                allocation: "across",
            },
            metadata: {
                affiliate_id: affiliate_id,
                affiliate_code: targetAffiliate.code,
                affiliate_email: targetAffiliate.email,
                commission_rate: commission_rate,
                created_by: currentAffiliate.id,
                created_at: new Date().toISOString(),
                source: "affiliate_system",
            },
            ...(limit && { limit }),
            ...(starts_at && { starts_at: new Date(starts_at) }),
            ...(ends_at && { ends_at: new Date(ends_at) }),
            campaign: {
                name: `Affiliate Campaign - ${code.toUpperCase()}`,
                campaign_identifier: `AFF-${code.toUpperCase()}`,
                budget: {
                    type: "usage",
                    limit: limit || 100000
                }
            }
        });

        res.status(201).json({
            message: "Promo code created successfully",
            promotion: {
                id: promotion.id,
                code: promotion.code,
                discount_type,
                discount_value,
                commission_rate,
                affiliate_id,
                status: promotion.status,
            },
        });
    } catch (error: any) {
        console.error("[Admin Promo Code API] Error:", error);
        res.status(400).json({ message: error.message || "Failed to create promo code" });
    }
}

// GET - 列出所有聯盟折扣碼
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const affiliateAuth = getAffiliateFromRequest(req);
        if (!affiliateAuth) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE);
        const currentAffiliate = await affiliateService.retrieveAffiliate(affiliateAuth.id);

        if (currentAffiliate.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admin access required" });
        }

        const { affiliate_id } = req.query;

        const promotionModuleService = req.scope.resolve(Modules.PROMOTION);

        // 查詢所有聯盟相關的 promotions
        // 注意：Medusa 2.x Promotion API 可能需要調適，這裡假設 listPromotions 可運作
        const [promotions] = await promotionModuleService.listAndCountPromotions(
            {},
            {
                take: 1000,
                relations: ["application_method"],
            }
        );

        // 記憶體內過濾 (因為 metadata 查詢可能受限)
        let affiliatePromotions = promotions.filter(
            (p: any) => p.metadata?.source === "affiliate_system"
        );

        // 如果指定了 affiliate_id，進一步過濾
        if (affiliate_id) {
            affiliatePromotions = affiliatePromotions.filter(
                (p: any) => p.metadata?.affiliate_id === affiliate_id
            );
        }

        res.json({
            promotions: affiliatePromotions.map((p: any) => ({
                id: p.id,
                code: p.code,
                discount_type: p.application_method?.type,
                discount_value: p.application_method?.value,
                commission_rate: p.metadata?.commission_rate,
                affiliate_id: p.metadata?.affiliate_id,
                affiliate_code: p.metadata?.affiliate_code,
                status: p.status,
                used: p.used || 0,
                limit: p.limit,
                created_at: p.metadata?.created_at,
            })),
        });
    } catch (error: any) {
        console.error("[Admin Promo Code API] Error:", error);
        res.status(400).json({ message: error.message || "Failed to list promo codes" });
    }
}
