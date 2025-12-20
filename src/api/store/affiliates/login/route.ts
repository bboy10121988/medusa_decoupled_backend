import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AFFILIATE_MODULE } from "../../../../modules/affiliate"
import AffiliateService from "../../../../modules/affiliate/service"
import * as bcrypt from "bcryptjs"
import { generateAffiliateToken } from "../../../../utils/affiliate-auth"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const affiliateService: AffiliateService = req.scope.resolve(AFFILIATE_MODULE)

  const { email, password } = req.body as any

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  const affiliates = await affiliateService.listAffiliates({ email })
  const affiliate = affiliates[0]

  if (!affiliate || !affiliate.password_hash) {
    return res.status(401).json({ message: "Invalid credentials" })
  }

  const isValid = await bcrypt.compare(password, affiliate.password_hash)
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" })
  }

  if (affiliate.status === 'rejected' || affiliate.status === 'suspended') {
    return res.status(403).json({ message: "Account is not active" })
  }

  const token = generateAffiliateToken({
    id: affiliate.id,
    email: affiliate.email,
    status: affiliate.status
  })

  // Return session object matching frontend expectation
  res.json({
    token,
    session: {
      id: affiliate.id,
      email: affiliate.email,
      displayName: affiliate.first_name ? `${affiliate.first_name} ${affiliate.last_name || ''}`.trim() : affiliate.email,
      status: affiliate.status,
      role: affiliate.role,
      created_at: affiliate.created_at
    }
  })
}
