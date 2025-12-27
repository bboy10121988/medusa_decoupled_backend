
import { ExecArgs } from "@medusajs/framework/types"

async function getPendingPayment({ container }: ExecArgs) {
    const query = container.resolve("query")

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "total",
                "payment_status",
                "payment_collections.*",
                "payment_collections.payments.*"
            ],
            options: {
                take: 20, // Check last 20 orders
            }
        })

        if (!orders || orders.length === 0) {
            console.log("No orders found.")
            return
        }

        // Sort manual
        orders.sort((a, b) => Number(b.display_id) - Number(a.display_id))

        // Find first one that has payment collection but not fully paid
        const targetOrder = orders.find(o => {
            // We look for an order that has a payment session waiting strictly
            // Or just print the info for the user to choose
            return o.payment_status === "pending" || o.payment_status === "not_paid"
        })

        console.log("--- PENDING ORDERS FOUND ---")
        orders.forEach(o => {
            const pc = o.payment_collections?.[0]
            const pay = pc?.payments?.[0]

            console.log(`Order ID: ${o.id} (Disply: ${o.display_id})`)
            console.log(`Status: ${o.payment_status}`)
            console.log(`PC ID: ${pc?.id}`)
            console.log(`Payment Session ID: ${pay?.payment_session_id}`)
            console.log(`Payment Amount: ${pay?.amount}`)
            console.log("-------------------------------")
        })

    } catch (error) {
        console.error("Error:", error)
    }
}

export default getPendingPayment
