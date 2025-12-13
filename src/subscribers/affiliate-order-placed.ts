import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function affiliateOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

  try {
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "total", "metadata"],
      filters: {
        id: data.id,
      },
    })

    if (!order) return

    // Check if order has affiliate info in metadata
    // Assuming frontend sets metadata: { affiliate_link_id: "..." }
    const linkId = (order.metadata as any)?.affiliate_link_id

    if (linkId) {
      // Try to find by ID first
      let links = await affiliateService.listAffiliateLinks({ id: linkId }, { relations: ["affiliate"] })

      // If not found, try to find by code
      if (links.length === 0) {
        links = await affiliateService.listAffiliateLinks({ code: linkId }, { relations: ["affiliate"] })
      }

      if (links.length > 0) {
        const link = links[0]
        // Use affiliate's specific commission rate or default to 10%
        const commissionRate = link.affiliate.commission_rate !== null && link.affiliate.commission_rate !== undefined
          ? Number(link.affiliate.commission_rate)
          : 0.1

        const commissionAmount = Number(order.total) * commissionRate

        await affiliateService.createAffiliateConversions({
          affiliate_id: link.affiliate.id,
          link_id: link.id,
          order_id: order.id,
          amount: order.total,
          commission: commissionAmount,
          status: "pending",
          metadata: {
            order_display_id: (order as any).display_id
          }
        })

        // Update affiliate stats
        await affiliateService.updateAffiliates({
          id: link.affiliate.id,
          total_earnings: Number(link.affiliate.total_earnings) + commissionAmount,
          balance: Number(link.affiliate.balance) + commissionAmount
        })

        // Update link stats
        await affiliateService.updateAffiliateLinks({
          id: link.id,
          conversions: (link.conversions || 0) + 1
        })

        console.log(`✅ Affiliate commission recorded for order ${order.id}`)
      }
    }
  } catch (error) {
    console.error("❌ Error processing affiliate commission:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
