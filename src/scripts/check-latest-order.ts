import { ExecArgs } from "@medusajs/framework/types"

async function checkLatestOrder({ container }: ExecArgs) {
    const query = container.resolve("query")

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "status",
                "total",
                "subtotal",
                "currency_code",
                "metadata",
                "items.*",
                "payment_collections.*",
                "payment_collections.payments.*"
            ]
        })

        if (!orders || orders.length === 0) {
            console.log("No orders found")
            return
        }

        // 手動排序，因為 graph 可能不支持在該實體上直接排序或分頁
        const sortedOrders = orders.sort((a: any, b: any) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )

        const order = sortedOrders[0]
        console.log("--- Order Info ---")
        console.log("ID:", order.id)
        console.log("Status:", order.status)
        console.log("Total:", order.total)
        console.log("Currency:", order.currency_code)
        console.log("Metadata:", JSON.stringify(order.metadata, null, 2))

        if (order.payment_collections) {
            console.log("--- Payment Collections ---")
            order.payment_collections.forEach((pc: any) => {
                console.log(`PC ID: ${pc.id}, Status: ${pc.status}, Amount: ${pc.amount}`)
                if (pc.payments) {
                    pc.payments.forEach((p: any) => {
                        console.log(`  Payment ID: ${p.id}, Amount: ${p.amount}, Status: ${p.status}, Session: ${p.payment_session_id}`)
                    })
                }
            })
        }

    } catch (error) {
        console.error("Error in script:", error)
    }
}

export default checkLatestOrder
