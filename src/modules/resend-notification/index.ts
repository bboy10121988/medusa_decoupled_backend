// 簡單的郵件發送服務
export default class ResendNotificationService {
  protected options_: any

  constructor(container, options: any) {
    this.options_ = options || {}
  }

  async send(notification: any) {
    const { to, template, data } = notification

    try {
      if (!this.options_.api_key) {
        // 開發模式 - 在控制台顯示重置連結
        console.log(`\n📧 ===== 開發模式郵件 =====`)
        console.log(`📤 收件人: ${to}`)
        console.log(`📋 範本: ${template}`)
        if (data?.reset_url) {
          console.log(`🔗 重置連結: ${data.reset_url}`)
          console.log(`\n✨ 請複製以下連結並在瀏覽器中開啟:`)
          console.log(`${data.reset_url}`)
        }
        console.log(`===========================\n`)
        return { success: true }
      }

      // 生產模式 - 使用 Resend API 發送真實郵件
      const emailContent = this.getEmailContent(template, data)
      const emailSubject = this.getEmailSubject(template)

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options_.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.options_.from_email || 'noreply@yourdomain.com',
          to: [to],
          subject: emailSubject,
          html: emailContent,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`Resend API 錯誤: ${error}`)
        return { success: false, error }
      }

      const result = await response.json()
      console.log(`✅ 郵件已成功發送至 ${to}`)

      return { success: true, messageId: result.id }
    } catch (error) {
      console.error(`發送郵件失敗:`, error)
      return { success: false, error: error.message }
    }
  }

  private getEmailSubject(template: string): string {
    if (template === 'password-reset') {
      return '重置您的密碼'
    }
    if (template === 'order-confirmation') {
      return '訂單確認通知 - Tim\'s Fantasy World'
    }
    if (template === 'admin-new-order') {
      return '新訂單通知 - 管理員'
    }
    return '通知'
  }

  private getEmailContent(template: string, data: any): string {
    switch (template) {
      case 'password-reset':
        return this.generatePasswordResetTemplate(data)
      case 'order-confirmation':
        return this.generateOrderConfirmationTemplate(data)
      case 'admin-new-order':
        return this.generateAdminOrderTemplate(data)
      default:
        return `<p>您有一則新通知</p>`
    }
  }

  private generatePasswordResetTemplate(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">重置您的密碼</h2>
          <p>您好，</p>
          <p>我們收到了重置您帳戶密碼的請求。請點擊下方按鈕來設置新密碼：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.reset_url}" 
               style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              重置密碼
            </a>
          </div>
          <p>如果上方按鈕無法點擊，請複製以下連結到瀏覽器：</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
            ${data.reset_url}
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            如果您沒有要求重置密碼，請忽略此郵件。此連結將在 24 小時後失效。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            此郵件由系統自動發送，請勿回覆。
          </p>
        </body>
      </html>
    `
  }

  private generateOrderConfirmationTemplate(data: any): string {
    const itemsList = data.items?.map(item =>
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
          <p style="margin: 5px 0;"><strong>銀行：</strong>國泰世華銀行 福和分行 (813)</p>
          <p style="margin: 5px 0;"><strong>帳號：</strong>216-087-069-471</p>
          <p style="margin: 5px 0;"><strong>戶名：</strong>提姆的髮藝沙龍</p>
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


  private generateAdminOrderTemplate(data: any): string {
    const itemsList = data.items?.map(item =>
      `<li>${item.title} x ${item.quantity} - $${(item.total / 100).toFixed(2)}</li>`
    ).join('') || '<li>無商品資訊</li>'

    const companyLine = data.shipping_address?.company ? `<p><strong>公司：</strong> ${data.shipping_address.company}</p>` : ''
    const address2Line = data.shipping_address?.address_2 ? `<p>${data.shipping_address.address_2}</p>` : ''
    const shippingSection = data.shipping_address ? `
      <div style="margin: 20px 0;">
        <h3>收件地址</h3>
        <p><strong>收件人：</strong> ${data.shipping_address.full_name}</p>
        ${companyLine}
        <p><strong>地址：</strong> ${data.shipping_address.address_1}</p>
        ${address2Line}
        <p>${data.shipping_address.city}, ${data.shipping_address.postal_code}</p>
      </div>
    ` : ''

    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">🎉 新訂單通知</h2>
          <p>您有一筆新訂單！</p>
          
          <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="margin: 0 0 10px 0; color: #155724;">訂單資訊</h3>
            <p><strong>訂單編號：</strong> ${data.order_id}</p>
            <p><strong>訂單日期：</strong> ${data.order_date}</p>
            <p><strong>客戶姓名：</strong> ${data.customer_name}</p>
            <p><strong>客戶郵箱：</strong> ${data.customer_email}</p>
            <p><strong>訂單總額：</strong> ${data.currency} $${(data.total_amount / 100).toFixed(2)}</p>
            <p><strong>商品數量：</strong> ${data.items_count} 項商品</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3>商品清單</h3>
            <ul>${itemsList}</ul>
          </div>
          
          ${shippingSection}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.admin_url}" 
               style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              🛠️ 管理訂單
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            此為系統自動通知郵件，請及時處理訂單。
          </p>
        </body>
      </html>
    `
  }
}