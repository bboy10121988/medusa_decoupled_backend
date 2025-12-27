
import { ExecArgs } from "@medusajs/framework/types"

async function inspectProduct({ container }: ExecArgs) {
    const query = container.resolve("query")
    const targetId = "prod_01KDEND030M7KZXBQDXYXD0B58"

    try {
        const { data: products } = await query.graph({
            entity: "product",
            fields: [
                "id",
                "title",
                "handle",
                "status",
                "images.*",
                "thumbnail",
                "variants.*",
                "options.*"
            ],
            filters: {
                id: targetId
            }
        })

        if (!products || products.length === 0) {
            console.log(`❌ Product ${targetId} NOT FOUND in query.graph`)
            return
        }

        const product = products[0]
        console.log("--- Product Debug Info ---")
        console.log(`ID: ${product.id}`)
        console.log(`Title: ${product.title}`)
        console.log(`Status: ${product.status}`)
        console.log(`Handle: ${product.handle}`)
        console.log(`Thumbnail: ${product.thumbnail}`)
        console.log(`Images: ${JSON.stringify(product.images)}`)
        console.log(`Variants Count: ${product.variants?.length}`)
        console.log(`Options Count: ${product.options?.length}`)

    } catch (error) {
        console.error("Error inspecting product:", error)
    }
}

export default inspectProduct
