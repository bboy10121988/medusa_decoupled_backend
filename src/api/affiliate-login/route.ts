import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"

// POST /affiliate-login - 聯盟登入 (備用路由)
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const body = req.body as { email?: string, password?: string }
    const { email, password } = body

    if (!email || !password) {
      res.status(400).json({
        error: "Missing credentials", 
        message: "Email and password are required"
      })
      return
    }

    // 驗證聯盟夥伴資訊
    const affiliatePartner = {
      id: "aff_partner_1",
      email,
      name: "測試聯盟夥伴",
      commission_rate: 0.05,
      status: "active"
    }

    res.json({
      partner: affiliatePartner,
      token: `aff_token_${Date.now()}`,
      success: true
    })
  } catch (error: any) {
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    })
  }
}
