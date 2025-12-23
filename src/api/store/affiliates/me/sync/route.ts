import { MedusaRequest, MedusaResponse, AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"
import { generateAffiliateToken } from "../../../../../utils/affiliate-auth"

/**
 * 用於 Google 登入後，同步會員帳號與推廣者帳號
 */
export async function POST(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
    const query = req.scope.resolve("query")

    // 1. 取得目前登入的 Customer
    const customerId = req.auth_context.actor_id

    const { data: [customer] } = await query.graph({
        entity: "customer",
        fields: ["id", "email", "first_name", "last_name"],
        filters: { id: customerId }
    })

    if (!customer || !customer.email) {
        return res.status(401).json({ message: "Customer not found" })
    }

    // 2. 檢查是否有對應 email 的推廣者
    const affiliates = await affiliateService.listAffiliates({ email: customer.email })

    if (affiliates.length === 0) {
        return res.json({ is_affiliate: false })
    }

    const affiliate = affiliates[0]

    if (affiliate.status === 'rejected' || affiliate.status === 'suspended') {
        return res.json({ is_affiliate: false, status: affiliate.status })
    }

    // 3. 產生推廣者 Token
    const token = generateAffiliateToken({
        id: affiliate.id,
        email: affiliate.email,
        status: affiliate.status
    })

    res.json({
        is_affiliate: true,
        token,
        session: {
            id: affiliate.id,
            email: affiliate.email,
            displayName: affiliate.first_name ? `${affiliate.first_name} ${affiliate.last_name || ''}`.trim() : affiliate.email,
            status: affiliate.status,
            role: affiliate.role || 'user',
            created_at: affiliate.created_at
        }
    })
}
