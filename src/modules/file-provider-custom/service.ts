import { AbstractFileProviderService } from "@medusajs/framework/utils"
import { FileTypes, LocalFileServiceOptions } from "@medusajs/framework/types"
import fs from "fs"
import path from "path"
import { parse } from "path"
import { Readable } from "stream"

type InjectedDependencies = {
  logger?: any
}

/**
 * 自定義 File Provider - 修正 URL 生成邏輯
 * 確保上傳的檔案 URL 格式為: https://domain.com/static/uploads/filename
 */
export default class CustomFileProviderService extends AbstractFileProviderService {
  static identifier = "custom-file"
  
  protected uploadDir_: string
  protected privateUploadDir_: string
  protected backendUrl_: string
  protected logger_: any

  constructor(
    { logger }: InjectedDependencies,
    options: LocalFileServiceOptions
  ) {
    super()
    
    this.logger_ = logger
    
    // 設定上傳目錄，預設為 static/uploads
    this.uploadDir_ = options?.upload_dir || path.join(process.cwd(), "static", "uploads")
    this.privateUploadDir_ = options?.private_upload_dir || path.join(process.cwd(), "static", "uploads")
    
    // 設定 backend URL，預設包含完整路徑
    this.backendUrl_ = options?.backend_url || "http://localhost:9000/static/uploads"
    
    this.logger_?.info(`Custom File Provider initialized with:`)
    this.logger_?.info(`  - Upload dir: ${this.uploadDir_}`)
    this.logger_?.info(`  - Backend URL: ${this.backendUrl_}`)
  }

  async upload(file: FileTypes.ProviderUploadFileDTO): Promise<FileTypes.ProviderFileResultDTO> {
    if (!file) {
      throw new Error(`No file provided`)
    }

    if (!file.filename) {
      throw new Error(`No filename provided`)
    }

    const parsedFilename = parse(file.filename)
    const baseDir = file.access === "public" ? this.uploadDir_ : this.privateUploadDir_

    await this.ensureDirExists(baseDir, parsedFilename.dir)

    // 生成檔案名稱：只包含時間戳和原始檔名
    const sanitizedBase = parsedFilename.base
      .replace(/[^\w\s.-]/g, '_')  // 替換特殊字符
      .replace(/\s+/g, '_')         // 空格變底線
      .replace(/_{2,}/g, '_')       // 多個底線合併

    const fileKey = path.join(
      parsedFilename.dir,
      `${file.access === "public" ? "" : "private-"}${Date.now()}-${sanitizedBase}`
    )

    const filePath = path.join(baseDir, fileKey)

    // 生成正確的 URL：直接使用 backend_url + 檔名
    // backend_url 已經包含完整路徑 (例如: https://admin.timsfantasyworld.com/static/uploads)
    const fileUrl = this.getUploadFileUrl(fileKey)

    let content: Buffer

    try {
      const decoded = Buffer.from(file.content, "base64")
      if (decoded.toString("base64") === file.content) {
        content = decoded
      } else {
        content = Buffer.from(file.content, "utf8")
      }
    } catch {
      content = Buffer.from(file.content, "binary")
    }

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(filePath, content)

    this.logger_?.info(`✅ File uploaded: ${fileKey} -> ${fileUrl}`)

    return {
      url: fileUrl,
      key: fileKey,
    }
  }

  async delete(file: FileTypes.ProviderDeleteFileDTO): Promise<void> {
    const baseDir = file.isPrivate ? this.privateUploadDir_ : this.uploadDir_
    const filePath = path.join(baseDir, file.fileKey)

    try {
      await fs.promises.unlink(filePath)
      this.logger_?.info(`✅ File deleted: ${file.fileKey}`)
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.logger_?.warn(`File not found for deletion: ${file.fileKey}`)
        return
      }
      throw error
    }
  }

  async getPresignedDownloadUrl(
    fileData: FileTypes.ProviderGetFileDTO
  ): Promise<string> {
    const fileKey = fileData.fileKey
    return this.getUploadFileUrl(fileKey)
  }

  async getDownloadStream(file: FileTypes.ProviderGetFileDTO): Promise<Readable> {
    const baseDir = file.isPrivate ? this.privateUploadDir_ : this.uploadDir_
    const filePath = path.join(baseDir, file.fileKey)
    
    return fs.createReadStream(filePath)
  }

  async getAsBuffer(file: FileTypes.ProviderGetFileDTO): Promise<Buffer> {
    const baseDir = file.isPrivate ? this.privateUploadDir_ : this.uploadDir_
    const filePath = path.join(baseDir, file.fileKey)
    
    return fs.promises.readFile(filePath)
  }

  private getUploadFileUrl = (fileKey: string): string => {
    // 關鍵修正：只使用 backend_url + 檔名
    // backend_url 已經包含完整的靜態路徑
    const baseUrl = new URL(this.backendUrl_)
    
    // 直接將 fileKey 附加到 pathname
    // 不需要額外處理，因為 backend_url 已經是完整路徑
    baseUrl.pathname = path.posix.join(baseUrl.pathname, fileKey)
    
    return baseUrl.href
  }

  private getFileKey(url: string): string {
    const urlObj = new URL(url)
    const baseUrlObj = new URL(this.backendUrl_)
    
    // 移除 backend_url 的路徑部分，取得檔案 key
    let fileKey = urlObj.pathname
    if (baseUrlObj.pathname !== "/") {
      fileKey = fileKey.replace(baseUrlObj.pathname, "")
    }
    
    return fileKey.startsWith("/") ? fileKey.slice(1) : fileKey
  }

  private async ensureDirExists(baseDir: string, dir: string) {
    const fullPath = path.join(baseDir, dir)
    
    try {
      await fs.promises.access(fullPath)
    } catch {
      await fs.promises.mkdir(fullPath, { recursive: true })
    }
  }
}
