import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * 產品建立通知訂閱者
 * 當產品建立時自動發送電子郵件通知
 */
export default async function productCreateHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
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
}

export const config: SubscriberConfig = {
  event: "product.created",
}