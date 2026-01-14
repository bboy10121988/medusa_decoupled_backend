import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
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
  const { id } = req.params
  const body = req.body as any

  const affiliate = await affiliateService.updateAffiliates({
    id,
    ...body
  })

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
