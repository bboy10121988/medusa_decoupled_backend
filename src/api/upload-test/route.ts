import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from 'fs'
import * as path from 'path'
import { IncomingForm } from 'formidable'

// 清理檔名函數：移除中文字符和特殊符號
function sanitizeFilename(filename: string): string {
  if (!filename) return Date.now().toString()
  
  // 獲取副檔名
  const ext = path.extname(filename)
  let baseName = path.basename(filename, ext)
  
  // 移除中文字符、特殊符號，只保留英文、數字、短橫線和底線
  baseName = baseName
    .replace(/[^\x00-\x7F]/g, '') // 移除非 ASCII 字符（包含中文）
    .replace(/[^a-zA-Z0-9\-_]/g, '') // 只保留字母、數字、短橫線、底線
    .replace(/^-+|-+$/g, '') // 移除開頭和結尾的短橫線
  
  // 如果清理後為空，使用時間戳
  if (!baseName) {
    baseName = Date.now().toString()
  }
  
  return baseName + ext.toLowerCase()
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const form = new IncomingForm()
    form.uploadDir = path.join(process.cwd(), 'uploads')
    form.keepExtensions = true
    
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
          const originalName = f.originalFilename || f.newFilename
          const sanitizedName = sanitizeFilename(originalName)
          const newPath = path.join(path.dirname(f.filepath), sanitizedName)
          
          // 重命名檔案為安全的檔名
          try {
            fs.renameSync(f.filepath, newPath)
          } catch (renameErr) {
            console.error('Rename error:', renameErr)
            // 如果重命名失敗，使用原始檔名
          }
          
          return {
            originalName: originalName,
            filename: sanitizedName,
            path: newPath,
            size: f.size,
            url: `http://35.236.182.29:9000/uploads/${sanitizedName}`
          }
        })
      }).flat()

      return res.json({
        message: "Files uploaded successfully",
        files: uploadedFiles
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
