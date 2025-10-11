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
    return '通知'
  }

  private getEmailContent(template: string, data: any): string {
    if (template === 'password-reset') {
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
    return `<p>您有一則新通知</p>`
  }
}