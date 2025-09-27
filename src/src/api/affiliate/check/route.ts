import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"

// GET /affiliate/check - 檢查聯盟夥伴狀態
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { token } = req.query as { token?: string }

    if (!token) {
      res.status(400).json({
        error: "Missing token",
        message: "Affiliate token is required"
      })
      return
    }

    // 這裡應該驗證token並獲取聯盟夥伴資訊
    // 暫時返回模擬資料
    const affiliate = {
      id: "aff_partner_1",
      name: "測試聯盟夥伴",
      email: "partner@example.com",
      commission_rate: 0.05,
      status: "active",
      total_earnings: 1250.00,
      pending_earnings: 350.00
    }

    res.json({
      affiliate,
      is_valid: true
    })
  } catch (error: any) {
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    })
  }
}
