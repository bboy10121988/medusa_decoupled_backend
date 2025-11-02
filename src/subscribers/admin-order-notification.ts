import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * 管理員訂單通知訂閱者
 * 當有新訂單時發送通知給管理員
 * 
 * ⚠️ 非同步執行，不阻塞訂單創建流程
 */
export default async function adminOrderNotificationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // 🚀 使用 setImmediate 讓郵件發送在下一個事件循環執行，不阻塞訂單創建
  setImmediate(async () => {
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

    if (!order) {
      console.error(`Order with ID ${data.id} not found`)
      return
    }

    // 管理員郵件地址
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@timsfantasyworld.com'
    
    console.log(`📧 發送新訂單通知給管理員: ${order.id}`)

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

    // 發送管理員通知
    await notificationModuleService.createNotifications({
      to: adminEmail,
      channel: "email",
      template: "admin-new-order", 
      data: {
        order_id: order.id,
        order_date: new Date().toLocaleDateString('zh-TW'),
        customer_name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || order.customer?.email || '匿名客戶',
        customer_email: order.customer?.email || '無',
        total_amount: totalAmount,
        currency: currency,
        items: items,
        items_count: items.length,
        shipping_address: order.shipping_address ? {
          full_name: `${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim(),
          company: order.shipping_address.company,
          address_1: order.shipping_address.address_1,
          address_2: order.shipping_address.address_2,
          city: order.shipping_address.city,
          country_code: order.shipping_address.country_code,
          postal_code: order.shipping_address.postal_code,
        } : null,
        admin_url: `${process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com'}/admin/orders/${order.id}`,
      },
    })

    console.log(`✅ 管理員訂單通知已發送至 ${adminEmail}`)

    } catch (error) {
      console.error("❌ 發送管理員訂單通知失敗:", error)
    }
  })
  
  // 立即返回，不等待郵件發送完成
}

export const config: SubscriberConfig = {
  event: "order.placed",
}