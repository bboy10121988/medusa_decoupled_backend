import { Utils } from "@medusajs/framework/utils"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

async function main({ container }) {
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    const [admins, count] = await affiliateService.listAndCountAffiliates({
        // @ts-ignore
        role: 'admin'
    })

    console.log('--- FOUND ADMINS ---')
    if (count === 0) {
        console.log('No affiliate with role "admin" found.')
    } else {
        admins.forEach(a => {
            console.log(`Email: ${a.email}, ID: ${a.id}, Status: ${a.status}`)
        })
    }
    console.log('--------------------')
}

export default main
