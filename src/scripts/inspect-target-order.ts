
import { ExecArgs } from "@medusajs/framework/types"

async function inspectTargetOrder({ container }: ExecArgs) {
    const query = container.resolve("query")
    const orderId = "order_01KDER3D4C5D0HWMWQWFWZJYJK"

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "payment_collections.id",
                "payment_collections.payments.id",
                "payment_collections.payments.payment_session_id",
                "payment_collections.payments.amount"
            ],
            filters: { id: orderId }
        })

        if (!orders.length) {
            console.log("Order not found")
            return
        }

        // Print JSON to be absolutely sure
        console.log(JSON.stringify(orders[0], null, 2))

    } catch (error) {
        console.error("Error:", error)
    }
}

export default inspectTargetOrder
