import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function affiliateOrderCaptured({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    try {
        console.log(`[Affiliate Subscriber] Processing order.payment_captured event for ID: ${data.id}`)

        // Call the service to capture conversion
        await affiliateService.captureConversion(data.id)

    } catch (error) {
        console.error("❌ [Affiliate Subscriber] FATAL ERROR processing capture:", error)
    }
}

export const config: SubscriberConfig = {
    event: "order.payment_captured",
}
