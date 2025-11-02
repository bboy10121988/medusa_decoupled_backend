import type { 
  MedusaRequest, 
  MedusaResponse,
  AuthenticatedMedusaRequest 
} from "@medusajs/framework/http"
import formidable from "formidable"
import fs from "fs"
import path from "path"

export const AUTHENTICATE = true

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  res.json({
    message: "File upload endpoint ready",
    methods: ["POST"],
    authenticated: true
  })
}

// 清理文件名函數
function sanitizeFilename(filename: string): string {
  if (!filename) return Date.now().toString()
  
  const ext = path.extname(filename)
  let baseName = path.basename(filename, ext)
  
  // 移除特殊字符，保留英文、數字、連字號和下劃線
  baseName = baseName
    .replace(/[^\w\-_.]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 50)
  
  return `${baseName}_${Date.now()}${ext}`
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    console.log("📤 File upload request received")

    // 確保上傳目錄存在
    const uploadDir = path.join(process.cwd(), 'static', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    // 解析表單數據
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: true,
      uploadDir: uploadDir,
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    
    const uploadedFiles: any[] = []
    const fileList = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean)
    
    for (const file of fileList) {
      if (!file) continue
      
      // 清理文件名
      const sanitizedName = sanitizeFilename(file.originalFilename || file.newFilename || 'upload')
      const newPath = path.join(uploadDir, sanitizedName)
      
      // 移動文件到最終位置
      if (file.filepath !== newPath) {
        fs.renameSync(file.filepath, newPath)
      }
      
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:9000'
      
      uploadedFiles.push({
        id: sanitizedName,
        url: `${baseUrl}/static/uploads/${sanitizedName}`,
        filename: file.originalFilename || file.newFilename,
        size: file.size,
        mimetype: file.mimetype || 'application/octet-stream'
      })
    }

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files`)
    
    res.json({
      files: uploadedFiles
    })
    
  } catch (error) {
    console.error("❌ Upload error:", error)
    res.status(500).json({
      message: "Upload failed", 
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}