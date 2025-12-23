import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function checkAffiliateStatus({ container }: ExecArgs) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    console.log("\n=== Checking Affiliate 'AFF-T31UAI' Status ===")

    const { data: affiliates } = await query.graph({
        entity: "affiliate",
        fields: ["id", "code", "email", "total_earnings", "balance"],
        filters: { code: "AFF-T31UAI" }
    })

    if (!affiliates || affiliates.length === 0) {
        console.log("Affiliate 'AFF-T31UAI' not found.")
        return
    }

    const aff = affiliates[0]
    console.log(`Affiliate: ${aff.email} (ID: ${aff.id})`)
    console.log(`Code: ${aff.code}`)
    console.log(`Earnings: ${aff.total_earnings}, Balance: ${aff.balance}`)

    console.log("\n--- Checking for conversions ---")
    const { data: conversions } = await query.graph({
        entity: "affiliate_conversion",
        fields: ["id", "order_id", "amount", "commission", "status", "created_at"],
        filters: { affiliate: { id: aff.id } }
    })

    if (!conversions || conversions.length === 0) {
        console.log("No conversions recorded.")
    } else {
        conversions.forEach(c => {
            console.log(`- Conv: ${c.id}, Order: ${c.order_id}, Amt: ${c.amount}, Comm: ${c.commission}, Status: ${c.status}, Date: ${c.created_at}`)
        })
    }

    console.log("\n--- Checking for links ---")
    const { data: links } = await query.graph({
        entity: "affiliate_link",
        fields: ["id", "code", "clicks"],
        filters: { affiliate: { id: aff.id } }
    })

    links.forEach(l => {
        console.log(`- Link: ${l.code} (ID: ${l.id}), Clicks: ${l.clicks}`)
    })
}
