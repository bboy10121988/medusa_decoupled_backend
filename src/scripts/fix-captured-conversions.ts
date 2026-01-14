import { ExecArgs } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function fixCapturedConversions({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    logger.info("Starting Fix for Captured Conversions...")

    try {
        // 1. Fetch all orders that are captured
        // We need to query the order module or main graph
        // Status in Medusa 1.x / 2.x usually 'captured' or 'payment_status' = captured
        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "display_id", "payment_status", "status"],
            filters: {
                payment_status: "captured", // Filter by payment_status captured
            },
        })

        logger.info(`Found ${orders.length} captured orders. Checking for pending conversions...`)

        let updatedCount = 0

        for (const order of orders) {
            // 2. Check if there are pending conversions for this order
            const conversions = await affiliateService.listAffiliateConversions({
                order_id: order.id,
                status: "pending"
            })

            if (conversions.length > 0) {
                logger.info(`Order ${order.id} (${(order as any).display_id}) is captured but has ${conversions.length} pending conversions. Fixing...`)

                await affiliateService.captureConversion(order.id)
                updatedCount += conversions.length
            }
        }

        logger.info(`✅ Fix Complete. Updated ${updatedCount} conversions to 'captured'.`)

    } catch (error) {
        logger.error("Error running fix script:", error)
    }
}
