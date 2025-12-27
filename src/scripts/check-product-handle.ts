
import { ExecArgs } from "@medusajs/framework/types"

async function checkProductHandle({ container }: ExecArgs) {
    const query = container.resolve("query")

    try {
        const { data: products } = await query.graph({
            entity: "product",
            fields: [
                "id",
                "title",
                "handle",
                "status"
            ],
            options: {
                sort: { created_at: "DESC" },
                take: 1
            }
        })

        if (!products || products.length === 0) {
            console.log("No products found.")
            return
        }

        const product = products[0]
        console.log("--- Latest Product Info ---")
        console.log("ID:", product.id)
        console.log("Title:", product.title)
        console.log("Handle:", product.handle)
        console.log("Status:", product.status)

        if (!product.handle) {
            console.error("❌ ERROR: Product handle is missing! Link generation will fail.")
        } else {
            console.log(`✅ Handle exists: ${product.handle}`)
            console.log(`Expected Link: /products/${product.handle}`)
        }

    } catch (error) {
        console.error("Error in script:", error)
    }
}

export default checkProductHandle
