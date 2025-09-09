import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from 'fs'
import * as path from 'path'
import { IncomingForm } from 'formidable'

// 管理員檔案上傳端點 - 使用 Medusa 內建檔案服務
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const form = new IncomingForm()
    form.uploadDir = path.join(process.cwd(), 'uploads')
    form.keepExtensions = true
    form.maxFileSize = 10 * 1024 * 1024 // 10MB limit
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err)
        return res.status(500).json({
          message: "Upload failed",
          error: err.message
        })
      }

      const uploadedFiles = Object.keys(files).map(key => {
        const file = files[key]
        const fileArray = Array.isArray(file) ? file : [file]
        return fileArray.map(f => {
          // 使用正確的 VM IP
          const baseUrl = process.env.BACKEND_URL || 'http://localhost:9000'
          return {
            id: f.newFilename,
            url: `${baseUrl}/uploads/${f.newFilename}`,
            name: f.originalFilename || f.newFilename,
            size: f.size,
            mime_type: f.mimetype || 'application/octet-stream'
          }
        })
      }).flat()

      // 返回 Medusa 格式的回應
      return res.json({
        uploads: uploadedFiles
      })
    })
  } catch (error) {
    console.error("Upload error:", error)
    return res.status(500).json({
      message: "Upload failed",
      error: error?.message || "Unknown error"
    })
  }
}
