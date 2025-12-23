import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function recoverConversion({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    const ORDER_ID = "order_01KD4KVVC5AEDW8RXDJVW33T1G"

    console.log(`\n=== Recovering Conversion for Order ${ORDER_ID} ===`)

    const { data: [order] } = await query.graph({
        entity: "order",
        fields: ["id", "status", "created_at", "metadata", "total", "currency_code"],
        filters: { id: ORDER_ID }
    })

    if (!order) {
        console.error("Order not found!")
        return
    }

    console.log("Order found:", order.id)
    console.log("Metadata:", order.metadata)

    const linkId = (order.metadata as any)?.affiliate_link_id

    if (!linkId) {
        console.log("No affiliate_link_id in metadata. Cannot recover.")
        return
    }

    console.log(`Found link ID/Code: ${linkId}. Attempting registration...`)

    try {
        const conversion = await affiliateService.registerConversion({
            order_id: order.id,
            order_amount: order.total,
            link_id: linkId,
            metadata: {
                order_display_id: (order as any).display_id || order.id, // Fallback if display_id missing in graph
                currency_code: order.currency_code,
                is_recovery: true
            }
        })

        console.log("Result:", conversion ? "Success" : "Failed (Returned null)")

        if (conversion) {
            console.log("Conversion ID:", conversion.id)
            console.log("Commission:", conversion.commission)
        }
    } catch (e) {
        console.error("Error during recovery:", e)
    }
}
