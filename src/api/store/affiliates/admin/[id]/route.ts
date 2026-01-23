import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
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

        // Get current affiliate to check status change
        const targetAffiliate = await affiliateService.retrieveAffiliate(id)
        const oldStatus = targetAffiliate.status

        const updateData: any = { id }
        if (status) updateData.status = status
        if (commission_rate !== undefined) updateData.commission_rate = commission_rate

        // Use updateAffiliates with array syntax (standard for Medusa Service)
        await affiliateService.updateAffiliates([updateData])

        const updated = await affiliateService.retrieveAffiliate(id)

        // Auto-create welcome promo code when status changes to 'active'
        if (oldStatus !== 'active' && status === 'active') {
            try {
                const promotionModuleService = req.scope.resolve(Modules.PROMOTION)

                // Check if welcome promo code already exists
                const [existingPromos] = await promotionModuleService.listAndCountPromotions(
                    {},
                    { take: 1000 }
                )

                const hasWelcomeCode = existingPromos.some(
                    (p: any) => p.metadata?.affiliate_id === id && p.metadata?.is_welcome_code === true
                )

                if (!hasWelcomeCode) {
                    // Generate welcome promo code
                    const welcomeCode = `${targetAffiliate.code}_WELCOME`.toUpperCase()

                    await promotionModuleService.createPromotions({
                        code: welcomeCode,
                        type: "standard",
                        status: "active",
                        is_automatic: false,
                        application_method: {
                            type: "percentage",
                            target_type: "order",
                            value: 10, // 10% discount for customers
                            allocation: "across",
                        },
                        metadata: {
                            affiliate_id: id,
                            affiliate_code: targetAffiliate.code,
                            affiliate_email: targetAffiliate.email,
                            commission_rate: 0.1, // 10% commission for affiliate
                            source: "affiliate_system",
                            is_welcome_code: true,
                            created_at: new Date().toISOString(),
                        },
                        campaign: {
                            name: `Affiliate Welcome - ${welcomeCode}`,
                            campaign_identifier: `AFF-WELCOME-${welcomeCode}`,
                            budget: {
                                type: "usage",
                                limit: 100000
                            }
                        }
                    })

                    console.log(`[Affiliate] Auto-created welcome promo code: ${welcomeCode} for affiliate ${id}`)
                }
            } catch (promoError) {
                console.error('[Affiliate] Failed to create welcome promo code:', promoError)
                // Don't fail the request if promo code creation fails
            }
        }

        res.json({ affiliate: updated })

        // Check if commission rate was updated and send notification
        if (commission_rate !== undefined) {
            const settings = (updated.settings as any) || {}
            // Default to true (notify for important updates) unless explicitly disabled
            const shouldNotify = settings.notifications?.emailOnCommissionUpdate !== false

            // Logic to send email
            if (shouldNotify && updated.email) {
                try {
                    const resendApiKey = process.env.RESEND_API_KEY
                    if (resendApiKey) {
                        const { Resend } = await import("resend")
                        const resend = new Resend(resendApiKey)
                        const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@timsfantasyworld.com"
                        console.log(`[Commission Notification] Preparing to send from: ${fromEmail} to: ${updated.email}`)

                        // Send logic here
                        await resend.emails.send({
                            from: fromEmail,
                            to: updated.email,
                            subject: `[通知] 您的佣金比例已調整`,
                            html: `
                                <h2>佣金比例調整通知</h2>
                                <p>親愛的 ${updated.first_name || '合作夥伴'} 您好：</p>
                                <p>您的推廣佣金比例已調整為：<strong>${(commission_rate * 100).toFixed(1)}%</strong></p>
                                <p>此調整即刻生效，感謝您的辛勤推廣！</p>
                                <br/>
                                <p>Tim's Fantasy World 團隊</p>
                            `
                        })
                        console.log(`[Commission Notification] Sent to ${updated.email}`)
                    }
                } catch (emailErr) {
                    console.error('[Commission Notification] Failed to send:', emailErr)
                }
            }
        }
    } catch (error) {
        console.error('[Admin Update API] Error:', error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}
