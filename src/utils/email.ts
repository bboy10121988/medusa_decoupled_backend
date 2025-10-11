// 簡單的 Resend 郵件發送工具
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'

  // 如果沒有配置 API 密鑰，使用開發模式
  if (!resendApiKey) {
    console.log(`\n📧 ===== 開發模式郵件 =====`)
    console.log(`📤 收件人: ${email}`)
    console.log(`🔗 重置連結: ${resetUrl}`)
    console.log(`\n✨ 請複製以下連結並在瀏覽器中開啟:`)
    console.log(`${resetUrl}`)
    console.log(`===========================\n`)
    return { success: true, mode: 'development' }
  }

  // 生產模式 - 使用 Resend API 發送真實郵件
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: '重置您的密碼',
        html: getPasswordResetEmailTemplate(resetUrl),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ Resend API 錯誤: ${error}`)
      
      // API 失敗時回退到開發模式
      console.log(`\n📧 ===== 回退到開發模式 =====`)
      console.log(`📤 收件人: ${email}`)
      console.log(`🔗 重置連結: ${resetUrl}`)
      console.log(`===========================\n`)
      
      return { success: true, mode: 'fallback', error }
    }

    const result = await response.json()
    console.log(`✅ 郵件已成功發送至 ${email}`)
    return { success: true, mode: 'production', messageId: result.id }
    
  } catch (error) {
    console.error(`❌ 發送郵件時發生錯誤:`, error)
    
    // 發生錯誤時回退到開發模式
    console.log(`\n📧 ===== 回退到開發模式 =====`)
    console.log(`📤 收件人: ${email}`)
    console.log(`🔗 重置連結: ${resetUrl}`)
    console.log(`===========================\n`)
    
    return { success: true, mode: 'fallback', error: error.message }
  }
}

function getPasswordResetEmailTemplate(resetUrl: string): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">重置您的密碼</h2>
        <p>您好，</p>
        <p>我們收到了重置您帳戶密碼的請求。請點擊下方按鈕來設置新密碼：</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            重置密碼
          </a>
        </div>
        <p>如果上方按鈕無法點擊，請複製以下連結到瀏覽器：</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
          ${resetUrl}
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