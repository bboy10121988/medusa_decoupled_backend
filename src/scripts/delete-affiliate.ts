import { ExecArgs } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

export default async function deleteAffiliate({ container }: ExecArgs) {
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    const email = "textsence.ai@gmail.com"
    console.log(`Processing deletion for: ${email}`)

    const existing = await affiliateService.listAffiliates({ email })

    if (existing.length > 0) {
        const affiliate = existing[0]
        console.log(`Affiliate found (ID: ${affiliate.id}). Deleting...`)

        await affiliateService.deleteAffiliates([affiliate.id])

        console.log("Successfully deleted affiliate.")
    } else {
        console.log("Affiliate not found.")
    }
}
