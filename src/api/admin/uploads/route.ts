import type {
  MedusaRequest,
  MedusaResponse,
  AuthenticatedMedusaRequest
} from "@medusajs/framework/http"
import formidable from "formidable"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

export const AUTHENTICATE = true

function sanitizeFilename(filename: string): string {
  if (!filename) return Date.now().toString()
  const ext = path.extname(filename)
  let baseName = path.basename(filename, ext)
  baseName = baseName
    .replace(/[^\w\-_.]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 50)
  return `${baseName}_${Date.now()}${ext}`
}

export async function POST(
  req: AuthenticatedMedusaRequest & { rawBody?: Buffer, files?: any },
  res: MedusaResponse
): Promise<void> {
  const startTime = Date.now()
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📤 File upload request received via /admin/uploads")

    // Check if files are already parsed (e.g. by global Multer middleware)
    if (req.files) {
      console.log("   📦 Found req.files! Processing pre-parsed files.")
      const uploadedFiles: any[] = []
      const filesArray = Array.isArray(req.files) ? req.files : Object.values(req.files).flat()

      for (const file of filesArray) {
        const originalFilename = file.originalname || file.originalFilename || file.name;
        const filepath = file.path || file.filepath;
        const mimetype = file.mimetype || file.type;
        const size = file.size;

        // Check for buffer or file path
        let sourcePath = filepath;
        if (!sourcePath && !file.buffer) {
          console.warn("   ⚠️ Skipping file with no path or buffer:", originalFilename)
          continue;
        }

        const sanitizedName = sanitizeFilename(originalFilename || 'upload')
        const uploadDir = path.join(process.cwd(), 'static', 'uploads')

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true })
        }
        const newPath = path.join(uploadDir, sanitizedName)

        if (file.buffer) {
          fs.writeFileSync(newPath, file.buffer)
        } else {
          try {
            // Try to move the file
            fs.renameSync(sourcePath, newPath)
          } catch (e) {
            // Fallback to copy and delete (e.g. across partitions)
            fs.copyFileSync(sourcePath, newPath)
            fs.unlinkSync(sourcePath)
          }
        }

        const baseUrl = process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com'
        const fullUrl = `${baseUrl}/static/uploads/${sanitizedName}`

        console.log(`   ✅ Saved file: ${sanitizedName}`)
        uploadedFiles.push({
          id: sanitizedName,
          url: fullUrl,
          filename: originalFilename,
          size: size,
          mimetype: mimetype || 'application/octet-stream'
        })
      }

      console.log(`   ✅ Successfully processed ${uploadedFiles.length} files`)
      res.json({ files: uploadedFiles })
      return;
    }

    // Fallback logic for stream handling (if req.files is missing, e.g. different env)
    // This part attempts to reconstruct the stream if body parser consumed it but left rawBody
    // Or uses formidable directly if stream is intact.

    let parserReq: any = req;
    if (req.rawBody && req.rawBody.length > 0) {
      console.log(`   📦 Found rawBody, recreating stream for formidable`)
      const stream = Readable.from(req.rawBody) as any
      stream.headers = req.headers
      stream.method = req.method
      stream.url = req.url
      parserReq = stream
    } else if (req.complete && !req.rawBody) {
      console.warn("   ⚠️ WARNING: Request stream is consumed but no rawBody/req.files found! Upload might hang.")
    }

    const uploadDir = path.join(process.cwd(), 'static', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      multiples: true,
      uploadDir: uploadDir,
      keepExtensions: true,
    })

    console.log("   Parsing form with formidable...")

    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(parserReq, (err, fields, files) => {
        if (err) {
          console.error("   ❌ Formidable parse error:", err)
          reject(err)
        } else {
          resolve([fields, files])
        }
      })
    })

    const uploadedFiles: any[] = []
    const fileList = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean)

    for (const file of fileList) {
      if (!file) continue

      const sanitizedName = sanitizeFilename(file.originalFilename || file.newFilename || 'upload')
      const newPath = path.join(uploadDir, sanitizedName)

      if (file.filepath !== newPath) {
        fs.renameSync(file.filepath, newPath)
      }

      const baseUrl = process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com'
      const fullUrl = `${baseUrl}/static/uploads/${sanitizedName}`

      console.log(`   ✅ Saved file: ${sanitizedName}`)

      uploadedFiles.push({
        id: sanitizedName,
        url: fullUrl,
        filename: file.originalFilename || file.newFilename,
        size: file.size,
        mimetype: file.mimetype || 'application/octet-stream'
      })
    }

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files via /admin/uploads`)

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
