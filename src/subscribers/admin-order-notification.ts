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
          "total",
          "subtotal",
          "tax_total",
          "discount_total",
          "shipping_total",
          "currency_code",
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
      const adminEmails = [
        process.env.ADMIN_EMAIL || 'timsfantasyworld@gmail.com',
        'textsence.ai@gmail.com'
      ]

      console.log(`📧 發送新訂單通知給管理員: ${order.id}`)
      console.log(`💰 原始金額資料 (Raw): Total=${order.total}, Sub=${order.subtotal}`)

      const currency = order.currency_code?.toUpperCase() || 'TWD'

      // 格式化商品列表 & 計算總額 (若 order.total 失效)
      let calculatedItemTotal = 0
      const items = order.items?.map((item: any) => {
        const unitPrice = Number(item.unit_price) || 0
        const quantity = Number(item.quantity) || 0
        const lineTotal = unitPrice * quantity

        calculatedItemTotal += lineTotal

        return {
          title: item.product?.title || item.title || '未知商品',
          quantity: quantity,
          unit_price: unitPrice,
          total: lineTotal
        }
      }) || []

      // 計算運費總額
      const shippingTotal = order.shipping_methods?.reduce((acc: number, method: any) => {
        return acc + (Number(method.amount) || Number(method.price) || 0)
      }, 0) || 0
      console.log(`🚚 計算運費總額: ${shippingTotal}`)

      // 計算訂單總金額
      // Medusa V2 可能回傳 String 類型的數字 (Main Unit)，不需要 / 100
      let totalAmount = Number(order.total)

      // Fallback: 若 order.total 為 undefined 或 0，改用計算值 (Items + Shipping)
      if (!totalAmount) {
        console.warn(`⚠️ Order.total 為 0 或無效，使用 Items + Shipping 計算`)
        totalAmount = calculatedItemTotal + shippingTotal
        console.log(`🔄 手動計算總額 (Items ${calculatedItemTotal} + Ship ${shippingTotal}): ${totalAmount}`)
      }

      // 優先使用 Resend 發送
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        console.log(`📧 使用 Resend API 發送管理員訂單通知`)
        const { Resend } = await import("resend")
        const resend = new Resend(resendApiKey)
        const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

        const htmlContent = generateAdminNotificationTemplate({
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
        })

        const result = await resend.emails.send({
          from: fromEmail,
          to: adminEmails,
          subject: `[新訂單] #${order.display_id || order.id} - ${currency} ${totalAmount}`,
          html: htmlContent,
        })
        // ... (略去部分未變更代碼) ...
      } else {
        // ... (略去 Local Notification 邏輯) ...
        // 註：這部分暫不修改，重點在 HTML Template
      }
    } catch (error) {
      console.error("❌ 發送管理員訂單通知失敗:", error)
    }
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

function generateAdminNotificationTemplate(data: any): string {
  // 注意：這裡移除了 / 100，假設數據已是 Main Unit
  const itemsList = data.items?.map((item: any) =>
    `<li>${item.title} x ${item.quantity} - $${Number(item.total).toFixed(2)}</li>`
  ).join('') || '<li>無商品資訊</li>'

  const address2Line = data.shipping_address?.address_2 ? `<p>${data.shipping_address.address_2}</p>` : ''
  const shippingSection = data.shipping_address ? `
    <div style="margin: 20px 0;">
      <h3>收件地址</h3>
      <p>${data.shipping_address.full_name}</p>
      <p>${data.shipping_address.address_1}</p>
      ${address2Line}
      <p>${data.shipping_address.city}, ${data.shipping_address.postal_code}</p>
    </div>
  ` : ''

  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #d32f2f;">[新訂單通知] Tim's Fantasy World</h2>
        
        <div style="background-color: #fff3e0; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 5px solid #ff9800;">
          <h3 style="margin: 0 0 10px 0;">訂單摘要</h3>
          <p><strong>訂單編號：</strong> ${data.order_id}</p>
          <p><strong>訂單日期：</strong> ${data.order_date}</p>
          <p><strong>客戶名稱：</strong> ${data.customer_name}</p>
          <p><strong>訂單總額：</strong> ${data.currency} $${Number(data.total_amount).toFixed(2)}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3>商品清單 (${data.items_count} 項)</h3>
          <ul>${itemsList}</ul>
        </div>
        
        ${shippingSection}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.admin_url}" 
             style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            前往後台查看訂單
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          此為系統自動發送的內部通知，請勿回覆。
        </p>
      </body>
    </html>
  `
}