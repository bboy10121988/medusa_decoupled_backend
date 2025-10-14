import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * 訂單完成通知訂閱者
 * 當訂單狀態變為已完成時自動發送電子郵件通知給客戶
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationModuleService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve("query")

  try {
    // 查詢訂單詳細資訊
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "*",
        "customer.*",
        "items.*",
        "items.product.*",
        "shipping_address.*",
        "billing_address.*"
      ],
      filters: {
        id: data.id,
      },
    })

    if (!order || !order.customer?.email) {
      console.error(`Order with ID ${data.id} not found or has no customer email`)
      return
    }

    console.log(`📧 發送訂單完成通知: ${order.id} 給 ${order.customer.email}`)

    // 計算訂單總金額
    const totalAmount = order.total || 0
    const currency = order.currency_code?.toUpperCase() || 'TWD'

    // 格式化商品列表
    const items = order.items?.filter(item => item !== null).map(item => ({
      title: item.product?.title || item.title || '未知商品',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total: (item.unit_price || 0) * (item.quantity || 0)
    })) || []

    // 發送通知 - 根據環境選擇提供者
    const provider = process.env.SENDGRID_API_KEY ? 'sendgrid' : 'local'
    
    await notificationModuleService.createNotifications({
      to: order.customer.email,
      channel: "email",
      template: "order-confirmation", // SendGrid 範本 ID
      data: {
        customer_name: `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || order.customer.email,
        order_id: order.id,
        order_date: new Date().toLocaleDateString('zh-TW'),
        total_amount: totalAmount,
        currency: currency,
        items: items,
        shipping_address: order.shipping_address ? {
          company: order.shipping_address.company,
          first_name: order.shipping_address.first_name,
          last_name: order.shipping_address.last_name,
          address_1: order.shipping_address.address_1,
          address_2: order.shipping_address.address_2,
          city: order.shipping_address.city,
          country_code: order.shipping_address.country_code,
          postal_code: order.shipping_address.postal_code,
        } : null,
        store_name: "Tim's Fantasy World",
        store_url: process.env.FRONTEND_URL || 'https://timsfantasyworld.com',
        order_url: `${process.env.FRONTEND_URL || 'https://timsfantasyworld.com'}/account/orders/${order.id}`,
      },
    })

    console.log(`✅ 訂單完成通知已發送給 ${order.customer.email} (使用 ${provider} 提供者)`)

  } catch (error) {
    console.error("❌ 發送訂單完成通知失敗:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}