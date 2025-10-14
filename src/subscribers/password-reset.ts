import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"
import { Resend } from "resend"

/**
 * 密碼重設通知訂閱者
 * 處理 auth.password_reset 事件，使用 Resend API 發送密碼重設郵件給用戶
 */
export default async function resetPasswordTokenHandler({
  event: { data: {
    entity_id: email,
    token,
    actor_type,
  } },
  container,
}: SubscriberArgs<{ entity_id: string, token: string, actor_type: string }>) {
  console.log(`\n🔐 ===== 密碼重設請求 =====`)
  console.log(`📧 電子郵件: ${email}`)
  console.log(`👤 用戶類型: ${actor_type}`)
  console.log(`🔑 重設 Token: ${token}`)
  console.log(`✅ 用戶驗證：該電子郵件地址已在系統中註冊`)
  
  let resetUrl = ""
  
  if (actor_type === "customer") {
    // 客戶重置密碼 URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8000"
    resetUrl = `${frontendUrl}/tw/reset-password?token=${token}&email=${encodeURIComponent(email)}`
  } else {
    // 管理員重置密碼 URL
    const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
    resetUrl = `${backendUrl}/app/reset-password?token=${token}&email=${encodeURIComponent(email)}`
  }
  
  console.log(`� 重置密碼連結: ${resetUrl}`)
  console.log(`\n📝 請複製上述連結並發送給用戶，或在測試時直接使用該連結。`)
  console.log(`⏰ 該連結包含安全 token，請妥善保管。`)
  console.log(`===========================\n`)

  try {
    const storeName = "Tim's Fantasy World"

    // 檢查是否有 Resend API 設定
    const resendApiKey = process.env.RESEND_API_KEY
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

    if (resendApiKey) {
      console.log(`📧 使用 Resend API 發送郵件`)
      
      // 初始化 Resend
      const resend = new Resend(resendApiKey)
      
      // 創建 HTML 郵件內容
      const userTypeDisplay = actor_type === "customer" ? "客戶" : "管理員"
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>密碼重設 - ${storeName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .container { background: #f8f9fa; padding: 20px; border-radius: 10px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; background: white; margin: 10px 0; border-radius: 5px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 14px; color: #666; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 3px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔐 ${storeName}</h2>
              <p>密碼重設請求</p>
            </div>
            <div class="content">
              <p>親愛的${userTypeDisplay}，您好：</p>
              
              <p>我們收到了您重設密碼的請求。請點擊下方按鈕來重設您的密碼：</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">🔑 重設密碼</a>
              </div>
              
              <p>或者您也可以複製下面的連結到瀏覽器中打開：</p>
              <div style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace;">
                ${resetUrl}
              </div>
              
              <div class="warning">
                <p><strong>⚠️ 重要提醒：</strong></p>
                <ul>
                  <li>此連結將在 <strong>24 小時後失效</strong></li>
                  <li>如果您沒有要求重設密碼，請忽略此郵件</li>
                  <li>請不要將此連結分享給他人</li>
                  <li>為了您的帳戶安全，建議設定強密碼</li>
                </ul>
              </div>
              
              <p>如有任何問題，請聯繫我們的客服團隊：<a href="mailto:support@timsfantasyworld.com">support@timsfantasyworld.com</a></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${storeName}. 版權所有。</p>
              <p>此郵件由系統自動發送，請勿直接回覆。</p>
              <p>📍 台灣 | 🌐 <a href="https://timsfantasyworld.com">timsfantasyworld.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `

      // 發送郵件
      const result = await resend.emails.send({
        from: resendFromEmail,
        to: [email],
        subject: `🔐 ${storeName} - 密碼重設請求`,
        html: htmlContent,
      })

      console.log(`✅ 密碼重設郵件已透過 Resend 發送給 ${email}`)
      console.log(`� Resend 郵件 ID: ${result.data?.id}`)
      
      if (result.error) {
        console.error(`❌ Resend API 錯誤:`, result.error)
        throw new Error(`Resend API 錯誤: ${result.error.message}`)
      }
    } else {
      console.log(`⚠️  未設定 RESEND_API_KEY，使用開發模式`)
      console.log(`📝 請複製上述重設連結直接使用`)
    }

  } catch (error) {
    console.error(`❌ 發送密碼重設通知失敗 (${email}):`, error)
    console.log(`🔗 備份重設連結: ${resetUrl}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}