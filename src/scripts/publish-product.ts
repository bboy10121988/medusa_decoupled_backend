
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

async function publishLatestProduct({ container }: ExecArgs) {
    const query = container.resolve("query")
    const productModuleService = container.resolve(Modules.PRODUCT)

    try {
        // 1. Find the latest draft product
        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "title", "status"],
            filters: {
                status: "draft"
            },
            options: {
                sort: { created_at: "DESC" },
                take: 1
            }
        })

        if (!products || products.length === 0) {
            console.log("No draft products found.")
            return
        }

        const product = products[0]
        console.log(`Found Draft Product: ${product.title} (${product.id})`)

        // 2. Publish it using Product Module Service
        await productModuleService.updateProducts(product.id, {
            status: "published"
        })

        console.log(`✅ Product published successfully!`)

    } catch (error) {
        console.error("Error publishing product:", error)
    }
}

export default publishLatestProduct
