
import { ExecArgs } from "@medusajs/framework/types"

async function inspectLatestOrder({ container }: ExecArgs) {
    const query = container.resolve("query")

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "total",
                "subtotal",
                "tax_total",
                "discount_total",
                "shipping_total",
                "paid_total",
                "refunded_total",
                "payment_status",
                "status",
                "created_at"
            ],
            options: {
                sort: { created_at: "DESC" },
                take: 1
            }
        })

        if (!orders || orders.length === 0) {
            console.log("No orders found.")
            return
        }

        const order = orders[0]
        console.log("--- Latest Order Debug Info ---")
        console.log(`ID: ${order.id} (Display #${order.display_id})`)
        console.log(`Status: ${order.status}, Payment: ${order.payment_status}`)
        console.log(`Created At: ${order.created_at}`)
        console.log("-------------------------------")
        console.log(`Total: ${order.total}`)
        console.log(`Subtotal: ${order.subtotal}`)
        console.log(`Tax Total: ${order.tax_total}`)
        console.log(`Shipping Total: ${order.shipping_total}`)
        console.log(`Discount Total: ${order.discount_total}`)
        console.log(`Paid Total: ${order.paid_total}`)
        console.log("-------------------------------")

    } catch (error) {
        console.error("Error inspecting order:", error)
    }
}

export default inspectLatestOrder
