import type { 
  MedusaRequest, 
  MedusaResponse,
  AuthenticatedMedusaRequest 
} from "@medusajs/framework/http"
import formidable from "formidable"
import fs from "fs"
import path from "path"

export const AUTHENTICATE = true

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
  const startTime = Date.now()
  try {
    console.log("📤 File upload request received via /admin/uploads")
    console.log(`   Request headers:`, req.headers['content-type'])
    console.log(`   Request size:`, req.headers['content-length'])

    // 確保上傳目錄存在
    const uploadDir = path.join(process.cwd(), 'static', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    console.log(`   ⏱️  [${Date.now() - startTime}ms] Directory check complete`)
    
    // 解析表單數據
    const parseStart = Date.now()
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: true,
      uploadDir: uploadDir,
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    console.log(`   ⏱️  [${Date.now() - parseStart}ms] Form parse complete`)
    
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
      
      const baseUrl = process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com'
      const fullUrl = `${baseUrl}/static/uploads/${sanitizedName}`
      
      console.log(`✅ Uploaded file via /admin/uploads: ${sanitizedName}`)
      console.log(`   URL: ${fullUrl}`)
      
      uploadedFiles.push({
        id: sanitizedName,
        url: fullUrl,
        key: sanitizedName,  // 只用檔名作為 key
        filename: file.originalFilename || file.newFilename,
        size: file.size,
        mimetype: file.mimetype || 'application/octet-stream'
      })
    }

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files via /admin/uploads`)
    
    // 返回格式：files（與 /admin/files 相同）
    res.status(200).json({
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
