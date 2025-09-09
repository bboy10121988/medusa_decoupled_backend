import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from 'fs'
import * as path from 'path'
import { IncomingForm } from 'formidable'

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
        return fileArray.map(f => ({
          originalName: f.originalFilename || f.newFilename,
          filename: f.newFilename,
          path: f.filepath,
          size: f.size,
          url: `${process.env.BACKEND_URL || 'http://localhost:9000'}/uploads/${f.newFilename}`
        }))
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
