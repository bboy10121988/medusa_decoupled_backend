import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"

// POST /store/affiliate/login - 聯盟夥伴登入
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

    // 這裡應該驗證聯盟夥伴登入資訊
    // 暫時返回模擬成功響應
    const affiliatePartner = {
      id: "aff_partner_1",
      email,
      name: "測試聯盟夥伴",
      commission_rate: 0.05, // 5%
      status: "active"
    }

    res.json({
      partner: affiliatePartner,
      token: `aff_token_${Date.now()}`,
      message: "Login successful"
    })
  } catch (error: any) {
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    })
  }
}
