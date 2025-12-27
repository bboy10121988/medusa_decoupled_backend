
import { ExecArgs } from "@medusajs/framework/types"

async function verifyFix({ container }: ExecArgs) {
    const query = container.resolve("query")

    try {
        // 1. Fetch the latest order (same as we did before)
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "total",
                "currency_code",
                "items.*"
            ],
            options: {
                sort: { created_at: "DESC" },
                take: 1
            }
        })

        if (!orders || orders.length === 0) {
            console.log("No orders found to verify.")
            return
        }

        const order = orders[0]
        console.log("--- Raw Order Data ---")
        console.log("Total Type:", typeof order.total)
        console.log("Total Value:", order.total)

        // 2. Simulate the logic we added to admin-order-notification.ts
        const totalAmount = Number(order.total) || 0
        const currency = order.currency_code?.toUpperCase() || 'TWD'

        console.log("--- Verified Logic ---")
        console.log(`Original Code would see: ${order.total}`)
        console.log(`New Code Result (Number(total)): ${totalAmount}`)

        // 3. Verify Items logic
        if (order.items && order.items.length > 0) {
            const item = order.items[0]
            const unitPrice = Number(item.unit_price) || 0
            const quantity = Number(item.quantity) || 0
            const total = unitPrice * quantity
            console.log(`Item Logic Verify: ${item.title} - Price: ${unitPrice}, Qty: ${quantity}, Total: ${total}`)
        }

        if (!isNaN(totalAmount) && totalAmount > 0) {
            console.log("✅ VERIFICATION SUCCESS: Total amount is correctly converted to a number.")
        } else {
            console.log("❌ VERIFICATION FAILED: Total amount is still invalid.")
        }

    } catch (error) {
        console.error("Error in verification script:", error)
    }
}

export default verifyFix
