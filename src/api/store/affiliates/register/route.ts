import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"
import * as bcrypt from "bcryptjs"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)
  
  const { email, password, first_name, last_name, phone } = req.body as any

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  const existing = await affiliateService.listAffiliates({ email })
  if (existing.length > 0) {
    return res.status(400).json({ message: "Email already registered" })
  }

  const password_hash = await bcrypt.hash(password, 10)
  
  // Generate a simple unique code
  const code = "AFF-" + Math.random().toString(36).substring(2, 8).toUpperCase()

  const affiliate = await affiliateService.createAffiliates({
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    code,
    status: "pending",
    balance: 0,
    total_earnings: 0,
    settings: {
      notifications: {
        emailOnNewOrder: true,
        emailOnPayment: true,
        emailOnCommissionUpdate: true
      }
    }
  })

  res.json({ 
    message: "Registration successful",
    affiliate: {
      id: affiliate.id,
      email: affiliate.email,
      status: affiliate.status
    }
  })
}
