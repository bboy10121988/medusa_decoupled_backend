
import { ExecArgs } from "@medusajs/framework/types"

async function inspectActualLatest({ container }: ExecArgs) {
    const query = container.resolve("query")

    try {
        // 抓取最近 10 筆，不依賴 DB sort，確保看到新訂單
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "*",
                "items.*",
                "items.product.*",
                "shipping_methods.*"
            ],
            options: {
                take: 10,
            }
        })

        if (!orders || orders.length === 0) {
            console.log("No orders found.")
            return
        }

        // 手動依 created_at 排序 (DESC)
        orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        const latestOrder = orders[0]

        console.log("--- REAL LATEST ORDER ---")
        console.log(`ID: ${latestOrder.id}`)
        console.log(`Display ID: ${latestOrder.display_id}`)
        console.log(`Created At: ${latestOrder.created_at}`)
        console.log(`Total: ${latestOrder.total} (Type: ${typeof latestOrder.total})`)
        console.log(`Subtotal: ${latestOrder.subtotal}`)
        console.log(`Shipping: ${latestOrder.shipping_total}`)
        console.log(`Tax: ${latestOrder.tax_total}`)

        console.log("--- ITEMS ---")
        latestOrder.items.forEach((item: any, index: number) => {
            console.log(`Item #${index + 1}: ${item.product?.title || item.title}`)
            console.log(`  Unit Price: ${item.unit_price}`)
            console.log(`  Quantity: ${item.quantity}`)
            console.log(`  Row Total: ${item.total}`)
        })

        console.log("--- SHIPPING METHODS ---")
        latestOrder.shipping_methods?.forEach((method: any, index: number) => {
            console.log(`Method #${index + 1}: ${method.name}`)
            console.log(`  Amount: ${method.amount}`)
            console.log(`  Price: ${method.price}`)
        })
        console.log("-------------------------")

    } catch (error) {
        console.error("Error inspecting order:", error)
    }
}

export default inspectActualLatest
