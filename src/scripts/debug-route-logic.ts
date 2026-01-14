import { ExecArgs } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function debugRouteLogic({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    logger.info("Debugging Route Logic for Ray Chou...")

    try {
        // 1. Get Conversions for Ray / Email
        const conversions = await affiliateService.listAffiliateConversions({}, { take: 100, relations: ['affiliate'] })
        const rayConversions = conversions.filter(c => (c.affiliate as any)?.email === 'bboy10121988@gmail.com')

        if (rayConversions.length === 0) {
            logger.warn("No conversions found for Ray.")
            return
        }

        const orderIds = rayConversions.map(c => c.order_id).filter(id => !!id)
        logger.info(`Found ${orderIds.length} orders for Ray: ${orderIds.join(', ')}`)

        // 2. Fetch Orders EXACTLY like route.ts
        const ordersMap = new Map<string, any>()
        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "status", "payment_status", "payment_collections.status"],
            filters: {
                id: orderIds
            }
        })
        orders.forEach((o: any) => ordersMap.set(o.id, o))

        // 3. Simulate Loop
        let captured_balance = 0
        let pending_balance = 0

        logger.info(`--- Starting Logic Simulation ---`)

        rayConversions.forEach((c: any) => {
            // If conversion is explicitly cancelled in affiliate system, ignore it matches
            if (c.status === 'cancelled') return

            const order = ordersMap.get(c.order_id)
            if (order?.status === 'canceled') {
                logger.info(`Conversion ${c.id} (Order ${c.order_id}): Order CANCELED. Skipping.`)
                return
            }

            const commission = Number(c.commission || 0)

            // LOGIC CHECK
            const pc = order?.payment_collections || []
            const isCaptured = pc.some((p: any) => p.status === 'captured' || p.status === 'completed')

            logger.info(`Conversion ${c.id} (Order ${c.order_id}):`)
            logger.info(`   -> Order Found? ${!!order}`)
            logger.info(`   -> Payment Collections: ${JSON.stringify(pc)}`)
            logger.info(`   -> isCaptured? ${isCaptured}`)

            if (isCaptured) {
                captured_balance += commission
            } else {
                pending_balance += commission
            }
        })

        logger.info(`--- Result ---`)
        logger.info(`Pending: ${pending_balance}`)
        logger.info(`Captured: ${captured_balance}`)


    } catch (error) {
        logger.error("Error running debug script:", error)
    }
}
