import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"

// GET /admin/affiliate/applications - 獲取聯盟申請列表
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // 這裡應該從資料庫獲取聯盟申請資料
    // 暫時返回模擬資料
    const applications = [
      {
        id: "aff_1",
        name: "測試聯盟夥伴",
        email: "partner@example.com",
        status: "pending",
        created_at: new Date(),
        updated_at: new Date()
      }
    ]

    res.json({
      applications,
      count: applications.length,
      offset: 0,
      limit: 20
    })
  } catch (error: any) {
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    })
  }
}
