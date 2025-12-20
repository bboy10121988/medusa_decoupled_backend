import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/utils"

export default async function debugSchema({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    console.log("Checking Affiliate Table Schema...")

    try {
        const result = await pgConnection.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'affiliate';
    `)

        console.log("Columns in 'affiliate' table:")
        result.rows.forEach(r => {
            console.log(`- ${r.column_name} (${r.data_type})`)
        })

    } catch (e) {
        console.error("Error checking schema:", e)
    }
}
