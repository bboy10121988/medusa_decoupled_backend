import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"
import * as fs from 'fs'
import * as path from 'path'

// GET /test-affiliate - 測試聯盟數據讀取 (不需要認證)
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // 讀取 affiliate.json 檔案
    const jsonFilePath = path.join(process.cwd(), 'src/data/affiliate.json')
    let affiliateData: any = { applications: [], affiliates: [] }
    
    try {
      if (fs.existsSync(jsonFilePath)) {
        const fileContent = fs.readFileSync(jsonFilePath, 'utf8')
        affiliateData = JSON.parse(fileContent)
      }
    } catch (readError) {
      console.error('Error reading affiliate.json:', readError)
    }

    // 獲取查詢參數
    const { status = 'pending' } = req.query

    // 過濾申請
    let applications = affiliateData.applications || []
    if (status && status !== 'all') {
      applications = applications.filter((app: any) => app.status === status)
    }

    res.json({
      success: true,
      message: "測試數據讀取成功",
      data: {
        applications,
        affiliates: affiliateData.affiliates || [],
        total_applications: (affiliateData.applications || []).length,
        pending_applications: applications.length
      }
    })

  } catch (error) {
    console.error("Test affiliate GET error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "測試數據讀取失敗"
    })
  }
}
