
import { ExecArgs } from "@medusajs/framework/types"

async function verifyOrderStatus({ container }: ExecArgs) {
    const query = container.resolve("query")
    const orderId = "order_01KDER3D4C5D0HWMWQWFWZJYJK"

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "payment_status",
                "payment_collections.payments.amount",
                "payment_collections.payments.captured_at"
            ],
            filters: { id: orderId }
        })

        if (!orders.length) {
            console.log("Order not found")
            return
        }

        const order = orders[0]
        console.log(`Order ID: ${order.id}`)
        console.log(`Payment Status: ${order.payment_status}`)
        console.log(`Payments:`, JSON.stringify(order.payment_collections, null, 2))

    } catch (error) {
        console.error("Error:", error)
    }
}

export default verifyOrderStatus
