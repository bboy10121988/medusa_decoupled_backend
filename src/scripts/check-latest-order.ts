
import {
    createContext,
    run
} from "@medusajs/framework/utils"
import { Modules } from "@medusajs/framework/utils"

async function checkLatestOrder() {
    const query = createContext().query

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "*",
                "total",
                "subtotal",
                "tax_total",
                "shipping_total",
                "discount_total",
                "currency_code",
                "status",
                "payment_status",
                "fulfillment_status",
                "items.*",
                "payment_collections.*",
                "payment_collections.payments.*",
                "metadata"
            ],
            options: {
                sort: { created_at: "DESC" },
                take: 1
            }
        })

        if (!orders || orders.length === 0) {
            console.log("No orders found")
            return
        }

        const order = orders[0]
        console.log("--- Order Info ---")
        console.log("ID:", order.id)
        console.log("Display ID:", order.display_id)
        console.log("Status:", order.status)
        console.log("Payment Status:", order.payment_status)
        console.log("Total:", order.total)
        console.log("Currency:", order.currency_code)
        console.log("Metadata:", JSON.stringify(order.metadata, null, 2))

        if (order.payment_collections) {
            console.log("--- Payment Collections ---")
            order.payment_collections.forEach((pc: any) => {
                console.log(`PC ID: ${pc.id}, Status: ${pc.status}, Amount: ${pc.amount}`)
                if (pc.payments) {
                    pc.payments.forEach((p: any) => {
                        console.log(`  Payment ID: ${p.id}, Amount: ${p.amount}, Status: ${p.status}`)
                    })
                }
            })
        }

    } catch (error) {
        console.error("Error:", error)
    }
}

// Check if running directly
if (require.main === module) {
    checkLatestOrder()
}

export default checkLatestOrder
