import type { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"

// POST /affiliate/applications - 提交聯盟申請
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const body = req.body as { 
      name?: string, 
      email?: string, 
      website?: string,
      description?: string,
      social_media?: string
    }
    const { name, email, website, description, social_media } = body

    if (!name || !email) {
      res.status(400).json({
        error: "Missing required fields",
        message: "Name and email are required"
      })
      return
    }

    // 這裡應該保存申請到資料庫
    const application = {
      id: `app_${Date.now()}`,
      name,
      email,
      website: website || "",
      description: description || "",
      social_media: social_media || "",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date()
    }

    res.status(201).json({ 
      application,
      message: "Application submitted successfully" 
    })
  } catch (error: any) {
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    })
  }
}
