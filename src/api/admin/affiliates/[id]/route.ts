import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { id } = req.params

  // Fetch affiliate with relations
  const affiliate = await affiliateService.retrieveAffiliate(id, {
    relations: ["links", "settlements", "conversions"]
  })

  // Dynamic Calculation Logic (Mirror Database)
  const conversions = affiliate.conversions || []
  const orderIds = conversions.map((c: any) => c.order_id).filter((id: any) => !!id) as string[]
  const ordersMap = new Map<string, any>()

  if (orderIds.length > 0) {
    try {
      const query = req.scope.resolve("query")
      const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "status", "payment_status", "payment_collections.status"],
        filters: {
          id: orderIds
        }
      })
      orders.forEach((o: any) => ordersMap.set(o.id, o))
    } catch (e) {
      console.error('[Admin Detail API] Failed to fetch orders:', e)
    }
  }

  let total_sales = 0
  let captured_balance = 0
  let pending_balance = 0

  // Update conversions with dynamic status and calculate totals
  const dynamicConversions = conversions.map((c: any) => {
    // Create a shallow copy to avoid mutating the original object if it's frozen
    const conv = { ...c }

    if (conv.status === 'cancelled') return conv

    const order = ordersMap.get(conv.order_id)
    if (order?.status === 'canceled') {
      conv.status = 'cancelled'
      return conv
    }

    const commission = Number(conv.commission || 0)
    const amount = Number(conv.amount || 0)
    total_sales += amount

    // If already paid/settled, don't count towards pending/captured balance
    if (conv.status === 'paid') {
      return conv
    }

    const isCaptured = (order?.payment_collections || []).some((pc: any) => pc.status === 'captured' || pc.status === 'completed')

    if (isCaptured) {
      captured_balance += commission
      conv.status = 'captured' // Dynamic UI update
    } else {
      pending_balance += commission
      conv.status = 'pending'
    }

    return conv
  })

  // Override affiliate properties for the frontend
  const responseAffiliate = {
    ...affiliate,
    balance: captured_balance, // UI uses 'balance' for "Pending Payout"
    captured_balance,
    pending_balance,
    total_sales,
    conversions: dynamicConversions
  }

  res.json({ affiliate: responseAffiliate })
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const promotionModuleService = req.scope.resolve(Modules.PROMOTION)
  const { id } = req.params
  const body = req.body as any

  // Get current affiliate to check status change
  const currentAffiliate = await affiliateService.retrieveAffiliate(id)
  const oldStatus = currentAffiliate.status
  const newStatus = body.status

  // Update affiliate
  const affiliate = await affiliateService.updateAffiliates({
    id,
    ...body
  })

  // Auto-create welcome promo code when status changes to 'active'
  if (oldStatus !== 'active' && newStatus === 'active') {
    try {
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
        const welcomeCode = `${currentAffiliate.code}_WELCOME`.toUpperCase()

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
            affiliate_code: currentAffiliate.code,
            affiliate_email: currentAffiliate.email,
            commission_rate: 0.1, // 10% commission for affiliate
            source: "affiliate_system",
            is_welcome_code: true,
            created_at: new Date().toISOString(),
          },
        })

        console.log(`[Affiliate] Auto-created welcome promo code: ${welcomeCode} for affiliate ${id}`)
      }
    } catch (error) {
      console.error('[Affiliate] Failed to create welcome promo code:', error)
      // Don't fail the request if promo code creation fails
    }
  }

  res.json({ affiliate })
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  const { id } = req.params

  await affiliateService.deleteAffiliates(id)

  res.json({
    id,
    object: "affiliate",
    deleted: true
  })
}
