/**
 * 商品詳情內容公開 API
 * 
 * 提供公開訪問的商品詳情圖和內容 (不需認證)
 */
import {
    MedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

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

        // 解析 metadata
        const detailContent = product.metadata?.detail_content || ''
        let detailImages: string[] = []

        if (product.metadata?.detail_images) {
            try {
                detailImages = JSON.parse(product.metadata.detail_images as string)
            } catch {
                detailImages = []
            }
        }

        let detailBlocks: any[] = []
        if (product.metadata?.detail_blocks) {
            try {
                detailBlocks = JSON.parse(product.metadata.detail_blocks as string)
            } catch {
                detailBlocks = []
            }
        }

        res.json({
            id: product.id,
            title: product.title,
            handle: product.handle,
            detail_content: detailContent,
            detail_images: detailImages,
            detail_blocks: detailBlocks
        })
    } catch (error: any) {
        console.error("Error retrieving product detail:", error)
        res.status(404).json({
            message: "Product not found",
            error: error.message
        })
    }
}
