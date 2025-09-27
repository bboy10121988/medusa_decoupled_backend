import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from 'fs'
import * as path from 'path'

// 靜態檔案服務 - 提供 uploads 目錄中的檔案
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // 從 URL 路徑中取得檔案名稱
    const filename = req.params.filename
    
    if (!filename) {
      return res.status(400).json({ message: "Filename is required" })
    }
    
    // 建構檔案路徑
    const filePath = path.join(process.cwd(), 'uploads', filename)
    
    // 檢查檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" })
    }
    
    // 讀取檔案
    const fileBuffer = fs.readFileSync(filePath)
    
    // 根據副檔名設定 Content-Type
    const ext = path.extname(filename).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
    }
    
    // 設定回應標頭
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', fileBuffer.length)
    res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year cache
    
    // 傳送檔案
    return res.send(fileBuffer)
    
  } catch (error) {
    console.error("Static file serve error:", error)
    return res.status(500).json({
      message: "Error serving file",
      error: error?.message || "Unknown error"
    })
  }
}
