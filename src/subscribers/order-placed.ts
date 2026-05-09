import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { Resend } from "resend"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

/**
 * 訂單完成通知訂閱者
 * 當訂單狀態變為已完成時自動發送電子郵件通知給客戶
 * 
 * ⚠️ 非同步執行，不阻塞訂單創建流程
 */
export default async function orderPlacedHandler({
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

      const emailData = {
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
      }

      // 優先使用 Resend 發送
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        console.log(`📧 使用 Resend API 發送訂單確認郵件`)
        const resend = new Resend(resendApiKey)
        const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

        const htmlContent = generateOrderConfirmationTemplate(emailData)

        const result = await resend.emails.send({
          from: fromEmail,
          to: order.customer.email,
          subject: `訂單確認通知 - Tim's Fantasy World`,
          html: htmlContent,
        })

        if (result.error) {
          console.error("❌ Resend 發送失敗:", result.error)
          throw result.error
        }

        console.log(`✅ Resend 郵件發送成功: ${result.data?.id}`)
      } else {
        // 降級到 Notification Module (通常是 Local Provider)
        console.log(`⚠️ 未設定 RESEND_API_KEY，使用 Notification Module (Local)`)

        await notificationModuleService.createNotifications({
          to: order.customer.email,
          channel: "email",
          template: "order-confirmation",
          data: emailData,
        })

        console.log(`✅ 訂單完成通知已發送給 ${order.customer.email} (使用 Local 提供者)`)
      }

      // --- Affiliate Tracking Logic Removed (Handled by specialized subscriber) ---
    } catch (error) {
      console.error("❌ 發送訂單完成通知失敗:", error)
    }
  })

  // 立即返回，不等待郵件發送完成
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

function generateOrderConfirmationTemplate(data: any): string {
  const itemsList = data.items?.map((item: any) =>
    `<li>${item.title} x ${item.quantity} - $${(item.total / 100).toFixed(2)}</li>`
  ).join('') || '<li>無商品資訊</li>'

  const address2Line = data.shipping_address?.address_2 ? `<p>${data.shipping_address.address_2}</p>` : ''
  const shippingSection = data.shipping_address ? `
    <div style="margin: 20px 0;">
      <h3>收件地址</h3>
      <p>${data.shipping_address.first_name} ${data.shipping_address.last_name}</p>
      <p>${data.shipping_address.address_1}</p>
      ${address2Line}
      <p>${data.shipping_address.city}, ${data.shipping_address.postal_code}</p>
    </div>
  ` : ''

  // 銀行轉帳匯款資訊區塊
  const bankTransferSection = `
    <div style="background-color: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
      <h3 style="margin: 0 0 15px 0; color: #856404;">🏦 銀行轉帳付款資訊</h3>
      <p style="margin: 0 0 5px 0; color: #856404;">如您選擇銀行轉帳付款，請依以下帳號進行匯款：</p>
      <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; margin-top: 10px;">
        <p style="margin: 5px 0;"><strong>銀行：</strong>國泰世華銀行 福和分行 (013)</p>
        <p style="margin: 5px 0;"><strong>帳號：</strong>216-03-500540-7</p>
        <p style="margin: 5px 0;"><strong>戶名：</strong>提姆的髮藝沙龍康仲一</p>
      </div>
      <p style="margin: 15px 0 0 0; color: #856404; font-size: 13px;">
        ⚠️ 請於 3 個工作日內完成轉帳，並保留轉帳證明。<br/>
        轉帳完成後請聯繫客服確認，確認收款後將安排出貨。
      </p>
    </div>
  `

  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">訂單確認 - Tim's Fantasy World</h2>
        <p>親愛的 ${data.customer_name}，</p>
        <p>感謝您的訂購！您的訂單已成功確認。</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0;">訂單詳情</h3>
          <p><strong>訂單編號：</strong> ${data.order_id}</p>
          <p><strong>訂單日期：</strong> ${data.order_date}</p>
          <p><strong>訂單總額：</strong> ${data.currency} $${(data.total_amount / 100).toFixed(2)}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3>商品清單</h3>
          <ul>${itemsList}</ul>
        </div>
        
        ${shippingSection}
        
        ${bankTransferSection}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.order_url}" 
             style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            查看訂單詳情
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          此郵件由 ${data.store_name} 自動發送，如有疑問請聯繫客服。
        </p>
      </body>
    </html>
  `
}