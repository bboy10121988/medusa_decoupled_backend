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
  
  // 移除特殊字符,保留英文、數字、連字號和下劃線
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
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📤 File upload request received via /admin/uploads")
    console.log(`   Request content-type:`, req.headers['content-type'])
    console.log(`   Request content-length:`, req.headers['content-length'])

    // 確保上傳目錄存在 - 使用與 files 相同的目錄結構
    const uploadDir = path.join(process.cwd(), 'static', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    console.log(`   ⏱️  [${Date.now() - startTime}ms] Directory check complete`)
    
    // 解析表單數據 - 使用與 files 相同的配置
    const parseStart = Date.now()
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB (與 Nginx 一致)
      multiples: true,
      uploadDir: uploadDir,
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    console.log(`   ⏱️  [${Date.now() - parseStart}ms] Form parse complete`)
    
    const uploadedFiles: any[] = []
    const fileList = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean)
    
    console.log(`   📦 Processing ${fileList.length} file(s)...`)
    
    const processStart = Date.now()
    for (const file of fileList) {
      if (!file) continue
      
      const fileStart = Date.now()
      // 清理文件名 - 與 files 相同的邏輯
      const sanitizedName = sanitizeFilename(file.originalFilename || file.newFilename || 'upload')
      const newPath = path.join(uploadDir, sanitizedName)
      
      // 移動文件到最終位置
      if (file.filepath !== newPath) {
        fs.renameSync(file.filepath, newPath)
      }
      
      // 使用與 files 相同的 URL 格式
      const baseUrl = process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com'
      const fullUrl = `${baseUrl}/static/uploads/${sanitizedName}`
      
      const fileTime = Date.now() - fileStart
      console.log(`   ✅ File: ${sanitizedName}`)
      console.log(`      Size: ${(file.size / 1024).toFixed(2)} KB`)
      console.log(`      Time: ${fileTime}ms`)
      console.log(`      URL: ${fullUrl}`)
      
      // 使用與 files 完全相同的回應格式
      uploadedFiles.push({
        id: sanitizedName,
        url: fullUrl,
        filename: file.originalFilename || file.newFilename,
        size: file.size,
        mimetype: file.mimetype || 'application/octet-stream'
      })
    }
    
    const processTime = Date.now() - processStart
    const totalTime = Date.now() - startTime
    
    console.log(`   ⏱️  Files processing: ${processTime}ms`)
    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files via /admin/uploads`)
    console.log(`   ⏱️  TOTAL TIME: ${totalTime}ms`)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    // 回應格式與 files 完全一致
    res.json({
      files: uploadedFiles
    })
    
  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.error("❌ Upload error:", error)
    console.error(`   ⏱️  Failed after: ${errorTime}ms`)
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    res.status(500).json({
      message: "Upload failed", 
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
