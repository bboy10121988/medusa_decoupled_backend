
import { ExecArgs } from "@medusajs/framework/types"

async function debugLatestOrder({ container }: ExecArgs) {
    const query = container.resolve("query")

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "*",
                "items.*",
                "items.product.*"
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
        console.log("--- LATEST ORDER RAW DATA ---")
        console.log(`ID: ${order.id}`)
        console.log(`Display ID: ${order.display_id}`)
        console.log(`Currency: ${order.currency_code}`)
        console.log(`Total:`, order.total, `(Type: ${typeof order.total})`)
        console.log(`Subtotal:`, order.subtotal)
        console.log(`Shipping:`, order.shipping_total)
        console.log(`Tax:`, order.tax_total)

        console.log("--- ITEMS ---")
        order.items.forEach((item, index) => {
            console.log(`Item #${index + 1}: ${item.product?.title || item.title}`)
            console.log(`  Quantity:`, item.quantity)
            console.log(`  Unit Price:`, item.unit_price, `(Type: ${typeof item.unit_price})`)
            console.log(`  Item Total (calc):`, Number(item.unit_price) * item.quantity)
        })
        console.log("-----------------------------")

    } catch (error) {
        console.error("Error debugging order:", error)
    }
}

export default debugLatestOrder
