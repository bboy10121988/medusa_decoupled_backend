import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"
import * as fs from 'fs'
import * as path from 'path'

// GET /admin/affiliate - 獲取聯盟申請列表
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
    const { status = 'pending', limit = 20, offset = 0 } = req.query

    // 過濾申請
    let applications = affiliateData.applications || []
    if (status && status !== 'all') {
      applications = applications.filter((app: any) => app.status === status)
    }

    // 分頁
    const total = applications.length
    const paginatedApplications = applications.slice(Number(offset), Number(offset) + Number(limit))

    res.json({
      applications: paginatedApplications,
      affiliates: affiliateData.affiliates || [],
      count: total,
      offset: Number(offset),
      limit: Number(limit)
    })

  } catch (error) {
    console.error("Admin affiliate GET error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "獲取聯盟申請列表失敗"
    })
  }
}

// POST /admin/affiliate - 審核聯盟申請 (批准/拒絕)
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const body = req.body as { 
      applicationId?: string
      action?: 'approve' | 'reject'
      commissionRate?: number
      referralCode?: string
    }
    
    const { applicationId, action, commissionRate = 0.05, referralCode } = body

    if (!applicationId || !action) {
      res.status(400).json({
        error: "Missing required fields",
        message: "Application ID and action are required"
      })
      return
    }

    // 讀取現有資料
    const jsonFilePath = path.join(process.cwd(), 'src/data/affiliate.json')
    let affiliateData: any = { applications: [], affiliates: [] }
    
    try {
      if (fs.existsSync(jsonFilePath)) {
        const fileContent = fs.readFileSync(jsonFilePath, 'utf8')
        affiliateData = JSON.parse(fileContent)
      }
    } catch (readError) {
      console.error('Error reading affiliate.json:', readError)
      res.status(500).json({
        error: "Internal server error",
        message: "讀取資料失敗"
      })
      return
    }

    // 找到對應申請
    const applicationIndex = affiliateData.applications.findIndex((app: any) => app.id === applicationId)
    if (applicationIndex === -1) {
      res.status(404).json({
        error: "Application not found",
        message: "找不到對應的申請"
      })
      return
    }

    const application = affiliateData.applications[applicationIndex]

    if (action === 'approve') {
      // 批准申請 - 移動到聯盟夥伴列表
      const newAffiliate = {
        id: `aff_partner_${Date.now()}`,
        name: application.name,
        email: application.email,
        referral_code: referralCode || `REF${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        commission_rate: commissionRate,
        status: "active",
        total_earnings: 0,
        pending_earnings: 0,
        website: application.website,
        social_media: application.socialMedia ? { description: application.socialMedia } : {},
        created_at: application.created_at,
        updated_at: new Date().toISOString()
      }

      // 添加到聯盟夥伴列表
      if (!affiliateData.affiliates) {
        affiliateData.affiliates = []
      }
      affiliateData.affiliates.push(newAffiliate)

      // 更新申請狀態
      affiliateData.applications[applicationIndex].status = 'approved'
      affiliateData.applications[applicationIndex].updated_at = new Date().toISOString()

    } else if (action === 'reject') {
      // 拒絕申請
      affiliateData.applications[applicationIndex].status = 'rejected'
      affiliateData.applications[applicationIndex].updated_at = new Date().toISOString()
    }

    // 寫回檔案
    try {
      fs.writeFileSync(jsonFilePath, JSON.stringify(affiliateData, null, 2))
    } catch (writeError) {
      console.error('Error writing affiliate.json:', writeError)
      res.status(500).json({
        error: "Internal server error",
        message: "更新資料失敗"
      })
      return
    }

    res.json({
      success: true,
      message: action === 'approve' ? '申請已批准' : '申請已拒絕',
      application: affiliateData.applications[applicationIndex]
    })

  } catch (error) {
    console.error("Admin affiliate POST error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "處理申請失敗"
    })
  }
}
