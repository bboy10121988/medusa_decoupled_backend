
import { ExecArgs } from "@medusajs/framework/types"

async function inspectApiKey({ container }: ExecArgs) {
    const query = container.resolve("query")
    const targetKey = "pk_df177fe4f1c94ded6d9f25681a9519cb20f462f9d240d4de1708304f9cc05dd7"

    try {
        const { data: apiKeys } = await query.graph({
            entity: "api_key",
            fields: [
                "id",
                "token",
                "title",
                "type",
                "sales_channels.*"
            ],
            filters: {
                token: targetKey
            }
        })

        if (!apiKeys || apiKeys.length === 0) {
            console.log(`❌ API Key ${targetKey} NOT FOUND`)
            return
        }

        const apiKey = apiKeys[0]
        console.log("--- API Key Info ---")
        console.log(`ID: ${apiKey.id}`)
        console.log(`Title: ${apiKey.title}`)
        console.log(`Type: ${apiKey.type}`)
        console.log(`Sales Channels Count: ${apiKey.sales_channels?.length}`)
        apiKey.sales_channels?.forEach(sc => {
            console.log(`  - ${sc.name} (${sc.id})`)
        })

    } catch (error) {
        console.error("Error inspecting API Key:", error)
    }
}

export default inspectApiKey
