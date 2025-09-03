import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"

// GET /affiliate/admin/affiliate/applications - 管理員獲取聯盟申請
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // 這裡應該驗證管理員權限
    // 暫時返回模擬資料
    const applications = [
      {
        id: "app_1",
        name: "聯盟夥伴A",
        email: "partner-a@example.com",
        website: "https://example-a.com",
        status: "pending",
        created_at: new Date("2024-01-15"),
        updated_at: new Date("2024-01-15")
      },
      {
        id: "app_2", 
        name: "聯盟夥伴B",
        email: "partner-b@example.com",
        website: "https://example-b.com",
        status: "approved",
        created_at: new Date("2024-01-10"),
        updated_at: new Date("2024-01-12")
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
