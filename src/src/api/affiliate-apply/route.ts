import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"
import * as fs from 'fs'
import * as path from 'path'

// POST /affiliate-apply - 聯盟註冊申請
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const body = req.body as { 
      name?: string
      email?: string 
      phone?: string
      website?: string
      socialMedia?: string
      experience?: string
      description?: string
    }
    
    const { name, email, phone, website, socialMedia, experience, description } = body

    // 基本驗證
    if (!name || !email) {
      res.status(400).json({
        error: "Missing required fields",
        message: "Name and email are required"
      })
      return
    }

    // 電子郵件格式驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: "Invalid email format",
        message: "Please provide a valid email address"
      })
      return
    }

    // 讀取現有的 affiliate.json 檔案
    const jsonFilePath = path.join(process.cwd(), 'src/data/affiliate.json')
    let affiliateData: any = {}
    
    try {
      if (fs.existsSync(jsonFilePath)) {
        const fileContent = fs.readFileSync(jsonFilePath, 'utf8')
        affiliateData = JSON.parse(fileContent)
      }
    } catch (readError) {
      console.error('Error reading affiliate.json:', readError)
      // 如果讀取失敗，使用預設結構
      affiliateData = { affiliates: [], applications: [] }
    }

    // 確保 applications 陣列存在
    if (!affiliateData.applications) {
      affiliateData.applications = []
    }

    // 檢查是否已有相同 email 的申請
    const existingApplication = affiliateData.applications.find((app: any) => app.email === email)
    if (existingApplication) {
      res.status(400).json({
        error: "Application exists",
        message: "此電子郵件地址已經提交過申請"
      })
      return
    }

    // 生成新申請
    const applicationId = `app_${Date.now()}`
    const newApplication = {
      id: applicationId,
      name,
      email,
      phone: phone || null,
      website: website || null,
      socialMedia: socialMedia || null,
      experience: experience || null,
      description: description || null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 添加新申請到陣列
    affiliateData.applications.push(newApplication)

    // 將更新後的資料寫回檔案
    try {
      fs.writeFileSync(jsonFilePath, JSON.stringify(affiliateData, null, 2))
    } catch (writeError) {
      console.error('Error writing affiliate.json:', writeError)
      res.status(500).json({
        error: "Internal server error",
        message: "申請提交失敗，請稍後再試"
      })
      return
    }

    res.status(201).json({
      success: true,
      message: "聯盟申請提交成功",
      data: {
        ...newApplication,
        message: "申請已提交，我們會在 3-5 個工作天內審核您的申請。"
      }
    })

  } catch (error) {
    console.error("Affiliate application error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "申請提交失敗，請稍後再試"
    })
  }
}
