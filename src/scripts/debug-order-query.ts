import { ExecArgs } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function debugOrderQuery({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    logger.info("Debugging Ray Chou Orders Query...")

    try {
        // 1. Get Conversions for Ray
        const conversions = await affiliateService.listAffiliateConversions({}, { take: 100, relations: ['affiliate'] })
        const rayConversions = conversions.filter(c => (c.affiliate as any)?.email === 'bboy10121988@gmail.com')

        if (rayConversions.length === 0) {
            logger.warn("No conversions found for Ray.")
            return
        }

        const orderIds = rayConversions.map(c => c.order_id).filter(id => !!id)
        logger.info(`Found ${orderIds.length} orders for Ray: ${orderIds.join(', ')}`)

        // 2. Run the EXACT query from route.ts
        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "status", "display_id", "total", "payment_collections.status", "payment_collections.amount"],
            filters: {
                id: orderIds
            }
        })

        // 3. Log results
        logger.info("--- Query Results ---")
        orders.forEach((o: any) => {
            logger.info(`Order ${o.id} (${o.display_id}):`)
            logger.info(`   > status: ${o.status}`)
            // logger.info(`   > payment_status: ${o.payment_status}`)
            logger.info(`   > payment_collections: ${JSON.stringify(o.payment_collections)}`)
            logger.info(`   > keys: ${Object.keys(o).join(', ')}`)
            // logger.info(`   > Dump: ${JSON.stringify(o)}`)
        })

    } catch (error) {
        logger.error("Error running debug script:", error)
    }
}
