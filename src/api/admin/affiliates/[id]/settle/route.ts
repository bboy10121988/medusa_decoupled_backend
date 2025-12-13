import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"

export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)

    try {
        const affiliate = await affiliateService.retrieveAffiliate(id)

        const balance = Number(affiliate.balance)

        if (balance <= 0) {
            return res.status(400).json({ message: "No balance to settle" })
        }

        // Create settlement record
        const settlement = await affiliateService.createAffiliateSettlements({
            affiliate_id: id,
            amount: balance,
            currency_code: "TWD", // Default to TWD for now, or fetch from region/store
            status: "paid", // Administrative settlement assumes payment is handled
            period_start: null, // Could be calculated
            period_end: new Date(),
            metadata: {
                settled_by: "admin_manual_action",
                settled_at: new Date().toISOString()
            }
        })

        // Reset affiliate balance
        await affiliateService.updateAffiliates({
            id,
            balance: 0
        })

        res.json({
            message: "Settlement created successfully",
            settlement
        })

    } catch (error) {
        console.error("Error creating settlement:", error)
        res.status(500).json({ message: "Internal server error" })
    }
}
