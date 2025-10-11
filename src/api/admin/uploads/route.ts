import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import formidable from "formidable";
import path from "path";
import fs from "fs";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // 創建上傳目錄
    const uploadDir = path.join(process.cwd(), "static", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 解析表單數據
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);

    const uploads: any[] = [];
    const fileArray = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);

    for (const file of fileArray) {
      if (file) {
        // 生成新的文件名
        const timestamp = Date.now();
        const originalName = file.originalFilename || 'upload';
        const extension = path.extname(originalName);
        const fileName = `${timestamp}_${path.basename(originalName, extension)}${extension}`;
        const newPath = path.join(uploadDir, fileName);

        // 移動文件到新位置
        fs.renameSync(file.filepath, newPath);

        uploads.push({
          url: `/static/uploads/${fileName}`,
          filename: fileName,
          originalName: originalName,
          size: file.size,
          mimetype: file.mimetype,
        });
      }
    }

    res.json({
      uploads,
      message: `成功上傳 ${uploads.length} 個文件`,
    });

  } catch (error) {
    console.error("文件上傳錯誤:", error);
    res.status(500).json({
      error: "文件上傳失敗",
      message: error instanceof Error ? error.message : "未知錯誤",
    });
  }
};