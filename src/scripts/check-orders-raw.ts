import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function checkLatestOrders({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    console.log("\n=== Checking Latest 5 Orders (Raw Metadata) ===")

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "status", "created_at", "metadata", "total"],
            pagination: {
                order: { created_at: "DESC" },
                take: 5
            }
        })

        if (!orders || orders.length === 0) {
            console.log("No orders found.")
            return
        }

        orders.forEach(order => {
            console.log(`\nOrder ID: ${order.id}`)
            console.log(`Status: ${order.status}`)
            console.log(`Created: ${order.created_at}`)
            console.log(`Metadata:`, order.metadata)
        })
    } catch (err) {
        console.error("Query failed:", err.message)
    }
}
