import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * 產品建立通知訂閱者 (已禁用)
 * 
 * ⚠️ 此 subscriber 已被禁用，改用 product-created-workflow.ts
 * 原因：避免重複發送郵件通知，提升商品創建速度
 * 
 * 如需啟用，請註解掉下面 export 前的註解
 */

// 已禁用：註解掉整個 handler
/*
export default async function productCreateHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // 🚀 使用 setImmediate 讓郵件發送在下一個事件循環執行，不阻塞商品創建
  setImmediate(async () => {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    const query = container.resolve("query")

    try {
      // 查詢產品詳細資訊
      const { data: [product] } = await query.graph({
        entity: "product",
        fields: ["*", "images.*"],
        filters: {
          id: data.id,
        },
      })

      if (!product) {
        console.error(`Product with ID ${data.id} not found`)
        return
      }

      console.log(`📧 發送產品建立通知: ${product.title}`)

      // 發送通知
      await notificationModuleService.createNotifications({
        to: "admin@timsfantasyworld.com", // 可以改為動態獲取管理員郵箱
        channel: "email",
        template: "product-created", // SendGrid 範本 ID
        data: {
          product_title: product.title,
          product_description: product.description,
          product_image: product.images?.[0]?.url || '',
          product_url: `${process.env.FRONTEND_URL || 'https://timsfantasyworld.com'}/products/${product.handle}`,
          admin_url: `${process.env.MEDUSA_ADMIN_BACKEND_URL || 'https://admin.timsfantasyworld.com'}/products/${product.id}`,
        },
      })

      console.log(`✅ 產品建立通知已發送`)

    } catch (error) {
      console.error("❌ 發送產品建立通知失敗:", error)
    }
  })
  
  // 立即返回，不等待郵件發送完成
}

export const config: SubscriberConfig = {
  event: "product.created",
}
*/