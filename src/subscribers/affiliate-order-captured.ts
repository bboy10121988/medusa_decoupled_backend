import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function affiliatePaymentCaptured({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)
    const query = container.resolve("query")

    try {
        console.log(`[Affiliate Subscriber] Processing payment.captured event for payment ID: ${data.id}`)

        // Find the order associated with this payment
        const { data: payments } = await query.graph({
            entity: "payment",
            fields: ["id", "payment_collection.order.id"],
            filters: { id: data.id }
        })

        if (!payments || payments.length === 0) {
            console.log(`[Affiliate Subscriber] Payment ${data.id} not found`)
            return
        }

        const orderId = payments[0]?.payment_collection?.order?.id
        if (!orderId) {
            console.log(`[Affiliate Subscriber] No order found for payment ${data.id}`)
            return
        }

        console.log(`[Affiliate Subscriber] Found order ${orderId} for payment ${data.id}`)

        // Call the service to capture conversion
        await affiliateService.captureConversion(orderId)

    } catch (error) {
        console.error("❌ [Affiliate Subscriber] FATAL ERROR processing capture:", error)
    }
}

export const config: SubscriberConfig = {
    event: "payment.captured",
}
