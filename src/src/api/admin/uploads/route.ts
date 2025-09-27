import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IncomingForm } from 'formidable'
import * as fs from 'fs'
import * as path from 'path'

// 清理檔名函數：移除中文字符和特殊符號
function sanitizeFilename(filename: string): string {
  if (!filename) return Date.now().toString()
  
  const ext = path.extname(filename)
  let baseName = path.basename(filename, ext)
  
  baseName = baseName
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .replace(/^-+|-+$/g, '')
  
  if (!baseName) {
    baseName = Date.now().toString()
  }
  
  return baseName + ext.toLowerCase()
}

// 管理員檔案上傳端點 - 使用本地檔案系統
export const AUTHENTICATE = true

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    console.log('Admin upload request received from authenticated user')
    
    console.log('Admin upload request received from authenticated user')
    
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
          // 清理檔名並重新命名檔案
          const sanitizedFilename = sanitizeFilename(f.originalFilename || f.newFilename)
          
          if (f.filepath && f.newFilename !== sanitizedFilename) {
            try {
              const oldPath = f.filepath
              const newPath = path.join(path.dirname(f.filepath), sanitizedFilename)
              fs.renameSync(oldPath, newPath)
              f.newFilename = sanitizedFilename
              console.log(`File renamed: ${f.originalFilename} -> ${sanitizedFilename}`)
            } catch (renameErr) {
              console.error('File rename error:', renameErr)
            }
          }
          
          // 使用本地檔案系統
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
