
import { ExecArgs } from "@medusajs/framework/types"

async function sendTestEmail({ container }: ExecArgs) {
    const query = container.resolve("query")

    // 1. Fetch Latest Order
    const { data: orders } = await query.graph({
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
            "billing_address.*",
            "shipping_methods.*" // 確保包含此修正欄位
        ],
        options: {
            take: 1,
            orderBy: { created_at: "DESC" } // Medusa V2 ordering syntax might differ, doing fetch all and sort
        }
    })

    // Medusa V2 sort fallback if options.orderBy fails
    const order = orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!order) {
        console.log("No order found to test.")
        return
    }

    console.log(`Testing with Order ID: ${order.id}`)

    // 2. Logic from admin-order-notification.ts
    const currency = order.currency_code?.toUpperCase() || 'TWD'

    // Calculations
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

    // Shipping
    const shippingTotal = order.shipping_methods?.reduce((acc: number, method: any) => {
        return acc + (Number(method.amount) || Number(method.price) || 0)
    }, 0) || 0

    console.log(`Shipping Total: ${shippingTotal}`)

    // Total
    let totalAmount = Number(order.total)
    if (!totalAmount) {
        console.log("Using calculated total (Fallback)")
        totalAmount = calculatedItemTotal + shippingTotal
    }

    console.log(`Total Amount: ${totalAmount}`)

    // 3. Send Email
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
        console.error("No RESEND_API_KEY found.")
        return
    }

    const { Resend } = await import("resend")
    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
    const targetEmail = "textsence.ai@gmail.com"

    const htmlContent = generateAdminNotificationTemplate({
        order_id: order.id,
        order_date: new Date(order.created_at).toLocaleDateString('zh-TW'),
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

    try {
        const result = await resend.emails.send({
            from: fromEmail,
            to: targetEmail,
            subject: `[測試發信] #${order.display_id || order.id} - ${currency} ${totalAmount}`,
            html: htmlContent,
        })
        console.log("Email sent successfully:", result)
    } catch (e) {
        console.error("Failed to send email:", e)
    }
}

// Template Function (Copied from admin-order-notification.ts)
function generateAdminNotificationTemplate(data: any): string {
    const itemsList = data.items?.map((item: any) =>
        `<li>${item.title} x ${item.quantity} - $${Number(item.total || (item.unit_price * item.quantity)).toFixed(2)}</li>`
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

export default sendTestEmail
