import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../../modules/affiliate"
import AffiliateService from "../../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../../utils/affiliate-auth"

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

        const { id } = req.params

        // Retrieve target affiliate with all necessary relations for the dashboard
        const affiliate = await affiliateService.retrieveAffiliate(id, {
            relations: ['links', 'conversions']
        })

        res.json({ affiliate })
    } catch (error) {
        console.error('[Admin Detail API] Error:', error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export async function POST(
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

        const { id } = req.params
        // Extract only allowed fields to update
        const { status, commission_rate } = req.body as { status?: string, commission_rate?: number }

        const updateData: any = { id }
        if (status) updateData.status = status
        if (commission_rate !== undefined) updateData.commission_rate = commission_rate

        // Use updateAffiliates with array syntax (standard for Medusa Service)
        await affiliateService.updateAffiliates([updateData])

        const updated = await affiliateService.retrieveAffiliate(id)

        res.json({ affiliate: updated })
    } catch (error) {
        console.error('[Admin Update API] Error:', error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}
