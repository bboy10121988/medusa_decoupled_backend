import {
  MedusaRequest,
  MedusaResponse,
  AuthenticatedMedusaRequest
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const AUTHENTICATE = true;

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params
  const { detail_content, detail_images, detail_blocks } = req.body as {
    detail_content?: string
    detail_images?: string[]
    detail_blocks?: any[]
  }

  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    // 獲取產品
    const product = await productModuleService.retrieveProduct(id)

    if (!product) {
      res.status(404).json({
        message: "Product not found"
      })
      return
    }

    // 更新 metadata，保留其他現有的 metadata
    const updatedMetadata = {
      ...product.metadata,
      detail_blocks: detail_blocks ? JSON.stringify(detail_blocks) : product.metadata?.detail_blocks,
      detail_content: detail_content || '',
      detail_images: JSON.stringify(detail_images || [])
    }

    // 更新產品 metadata
    await productModuleService.updateProducts(id, {
      metadata: updatedMetadata
    })

    res.json({
      success: true,
      message: "Product detail content updated successfully"
    })
  } catch (error) {
    console.error("Error updating product detail content:", error)
    res.status(400).json({
      message: "Failed to update product detail content",
      error: error.message
    })
  }
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params

  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    // 獲取產品
    const product = await productModuleService.retrieveProduct(id)

    if (!product) {
      res.status(404).json({
        message: "Product not found"
      })
      return
    }

    const detailContent = product.metadata?.detail_content || ''
    const detailImages = product.metadata?.detail_images
      ? JSON.parse(product.metadata.detail_images as string)
      : []

    res.json({
      detail_content: detailContent,
      detail_images: detailImages
    })
  } catch (error) {
    console.error("Error retrieving product detail content:", error)
    res.status(404).json({
      message: "Product not found",
      error: error.message
    })
  }
}