import { ExecArgs } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function debugRayOrders({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    logger.info("Debugging Ray Chou Orders...")

    try {
        // 1. Find Affiliate "Ray Chou" (we know email from screenshot: bboy10121988@gmail.com)
        // Or just list all conversions and see.

        // Let's get all conversions first.
        const conversions = await affiliateService.listAffiliateConversions({}, { take: 100, relations: ['affiliate'] })

        logger.info(`Found ${conversions.length} total conversions.`)

        for (const conv of conversions) {
            if ((conv.affiliate as any)?.email === 'bboy10121988@gmail.com' || (conv.affiliate as any)?.first_name === 'Ray') {
                logger.info(`Checking Conversion ${conv.id} (Status: ${conv.status}) - Order: ${conv.order_id}`)

                // Fetch Order Status
                const { data: [order] } = await query.graph({
                    entity: "order",
                    fields: ["id", "display_id", "status", "payment_status", "total"],
                    filters: { id: conv.order_id }
                })

                if (order) {
                    logger.info(`   -> Order Keys: ${Object.keys(order).join(', ')}`)
                    logger.info(`   -> Order dump: ${JSON.stringify(order)}`)
                    logger.info(`   -> Order ${order.display_id}: Status=${order.status}, Payment=${order.payment_status}`)
                } else {
                    logger.warn(`   -> Order ${conv.order_id} NOT FOUND`)
                }
            }
        }

    } catch (error) {
        logger.error("Error running debug script:", error)
    }
}
