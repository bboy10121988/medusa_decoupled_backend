import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"
import { getAffiliateFromRequest } from "../../../../utils/affiliate-auth"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateAuth = getAffiliateFromRequest(req)
  if (!affiliateAuth) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)

  /* DYNAMIC CALCULATION START */
  const affiliateData = await affiliateService.retrieveAffiliate(affiliateAuth.id, {
    relations: ["conversions", "settlements"]
  })

  // Mirror Logic from Admin API
  const conversions = affiliateData.conversions || []
  const settlements = affiliateData.settlements || []

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
      console.error('[Store Me API] Failed to fetch orders:', e)
    }
  }

  let total_sales = 0
  let captured_balance = 0
  let pending_balance = 0
  let total_commission_all_time = 0

  conversions.forEach((c: any) => {
    if (c.status === 'cancelled') return

    const order = ordersMap.get(c.order_id)
    if (order?.status === 'canceled') return

    const commission = Number(c.commission || 0)
    const amount = Number(c.amount || 0)

    total_sales += amount
    total_commission_all_time += commission

    // If already paid, it's not in the balance
    if (c.status === 'paid') return

    const isCaptured = (order?.payment_collections || []).some((pc: any) => pc.status === 'captured' || pc.status === 'completed')

    if (isCaptured) {
      captured_balance += commission
    } else {
      pending_balance += commission
    }
  })

  // Calculate Total Settled
  const total_settled = settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0)

  res.json({
    id: affiliateData.id,
    email: affiliateData.email,
    first_name: affiliateData.first_name,
    last_name: affiliateData.last_name,
    code: affiliateData.code,
    status: affiliateData.status,
    balance: captured_balance, // Pending Payout (Ready to Settle)
    pending_balance: pending_balance, // Not yet captured
    total_earnings: total_commission_all_time,
    total_settled: total_settled,
    total_sales: total_sales,
    settings: affiliateData.settings,
    role: affiliateData.role,
    settlements: settlements
  })
}
