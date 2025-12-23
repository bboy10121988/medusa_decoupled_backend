import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"
import * as bcrypt from "bcryptjs"

async function main({ container }) {
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    const email = "textsence.ai@gmail.com"
    const password = "Aa123456@"
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log(`Processing admin user: ${email}`)

    const existing = await affiliateService.listAffiliates({ email })

    if (existing.length > 0) {
        console.log("User exists. Updating to admin role and setting password...")
        await affiliateService.updateAffiliates({
            id: existing[0].id,
            password_hash: hashedPassword,
            role: 'admin',
            status: 'active'
        })
        console.log("Updated successfully.")
    } else {
        console.log("User does not exist. Creating new admin user...")
        const code = "ADMIN-" + Math.random().toString(36).substring(2, 6).toUpperCase()

        await affiliateService.createAffiliates({
            email,
            password_hash: hashedPassword,
            first_name: "Admin",
            last_name: "User",
            code,
            role: 'admin',
            status: 'active',
            balance: 0,
            total_earnings: 0
        })
        console.log("Created successfully.")
    }
}

export default main
