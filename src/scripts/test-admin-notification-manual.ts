import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
// Import both handlers
import orderPlacedHandler from "../subscribers/order-placed"
import adminOrderNotificationHandler from "../subscribers/admin-order-notification"

export default async function ({ container }: ExecArgs) {
    const query = container.resolve("query")

    console.log("🔍 Searching for the most recent order...")

    let { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "created_at"],
        pagination: {
            take: 1,
            order: {
                created_at: "DESC"
            }
        }
    })

    // Use existing order logic (same as before)
    if (!orders || orders.length === 0) {
        console.log("❌ No orders found.")
        return
    }

    const order = orders[0]
    console.log(`✅ Using order: ${order.id} (Created: ${order.created_at})`)

    // Test 1: Customer Notification (Should be sent to original customer email, as we reverted changes)
    // We can skip this if we only want to test Admin, but testing both ensures no regression.
    // console.log("📧 Invoking Customer orderPlacedHandler...")
    // await orderPlacedHandler({
    //   event: {
    //     name: "order.placed",
    //     data: { id: order.id },
    //     time: new Date(),
    //     metadata: {},
    //   } as any,
    //   container,
    //   pluginOptions: {}
    // } as any)


    // Test 2: Admin Notification
    console.log("📧 Invoking Admin adminOrderNotificationHandler...")
    await adminOrderNotificationHandler({
        event: {
            name: "order.placed",
            data: { id: order.id },
            time: new Date(),
            metadata: {},
        } as any,
        container,
        pluginOptions: {}
    } as any)

    console.log("⏳ Waiting 10 seconds to allow async email logic to execute...")
    await new Promise(resolve => setTimeout(resolve, 10000))

    console.log("🏁 Test script finished.")
}
