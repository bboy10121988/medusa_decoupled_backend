import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const AUTHENTICATE = false

// Google 用戶通知郵件函數
async function sendGoogleUserNotificationEmail(email: string, loginUrl: string) {
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'

  if (!resendApiKey) {
    console.log(`\n📧 ===== Google 用戶通知郵件 (開發模式) =====`)
    console.log(`📤 收件人: ${email}`)
    console.log(`🔗 登入連結: ${loginUrl}`)
    console.log(`💡 此用戶使用 Google 登入，無需重設密碼`)
    console.log(`===============================\n`)
    return { success: true, mode: 'development' }
  }

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
        subject: '登入提醒 - Tim\'s Fantasy World',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">登入提醒</h2>
            <p>您好，</p>
            <p>我們收到了您的密碼重設請求，但您的帳號是透過 <strong>Google</strong> 註冊和登入的。</p>
            <p><strong>Google 帳號無需設置密碼</strong>，請直接使用 Google 登入即可：</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                🔍 使用 Google 登入
              </a>
            </p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                💡 <strong>提醒</strong>：Google 帳號使用您的 Google 帳戶進行安全驗證，無需額外設置密碼。
              </p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              如果您沒有請求密碼重設，請忽略此郵件。
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              此郵件由 Tim's Fantasy World 系統自動發送，請勿回覆。
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ Resend API 錯誤: ${error}`)
      return { success: false, error }
    }

    const result = await response.json()
    console.log(`✅ Google 用戶通知郵件已發送至 ${email}，ID: ${result.id}`)
    return { success: true, mode: 'production', messageId: result.id }
    
  } catch (error: any) {
    console.error(`❌ 發送 Google 用戶通知郵件時發生錯誤:`, error)
    return { success: false, error: error.message }
  }
}

// 內建的郵件發送函數
async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'

  if (!resendApiKey) {
    console.log(`\n📧 ===== 開發模式郵件 =====`)
    console.log(`📤 收件人: ${email}`)
    console.log(`🔗 重置連結: ${resetUrl}`)
    console.log(`===========================\n`)
    return { success: true, mode: 'development' }
  }

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
        subject: '密碼重設 - Tim\'s Fantasy World',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">密碼重設請求</h2>
            <p>您好，</p>
            <p>我們收到了您的密碼重設請求。請點擊下方按鈕來重設您的密碼：</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">重設密碼</a>
            </p>
            <p>如果按鈕無法點擊，請複製以下連結到瀏覽器：</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              如果您沒有請求密碼重設，請忽略此郵件。<br>
              此連結將在 24 小時後失效。
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              此郵件由 Tim's Fantasy World 系統自動發送，請勿回覆。
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ Resend API 錯誤: ${error}`)
      return { success: false, error }
    }

    const result = await response.json()
    console.log(`✅ 郵件已成功發送至 ${email}，ID: ${result.id}`)
    return { success: true, mode: 'production', messageId: result.id }
    
  } catch (error: any) {
    console.error(`❌ 發送郵件時發生錯誤:`, error)
    return { success: false, error: error.message }
  }
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    console.log('🔐 收到自定義密碼重設請求')
    console.log('📋 Body:', req.body)
    
    const { identifier } = req.body as { identifier: string }
    
    if (!identifier) {
      return res.status(400).json({
        error: 'Missing identifier (email)'
      })
    }

    // 獲取必要的模組服務
    const authModuleService = req.scope.resolve("auth")
    const customerModuleService = req.scope.resolve("customer")
    
    try {
      // 首先檢查客戶是否存在
      console.log('🔍 正在查找客戶:', identifier)
      const customers = await customerModuleService.listCustomers({
        email: identifier
      })
      
      console.log('📋 查找結果:', customers ? customers.length : 'null', '個客戶')
      
      if (!customers || customers.length === 0) {
        console.log('⚠️ 找不到客戶:', identifier)
        // 暫時直接發送測試郵件，不管客戶是否存在
        console.log('📧 發送測試郵件...')
        const testToken = Buffer.from(`test:${Date.now()}:${Math.random()}`).toString('base64')
        const defaultRegion = process.env.DEFAULT_REGION || 'tw'
        const testResetUrl = `http://localhost:8000/${defaultRegion}/reset-password?token=${testToken}&email=${encodeURIComponent(identifier)}`
        const emailResult = await sendPasswordResetEmail(identifier, testResetUrl)
        console.log('✅ 測試郵件發送結果:', emailResult)
        
        return res.status(201).json({
          message: 'If the email exists, a reset link has been sent'
        })
      }
      
      const customer = customers[0]
      console.log('✅ 找到客戶:', customer.id)
      
      // 查找認證身份 - 用 raw SQL 直接查 provider_identity
      // emailpass: entity_id = email
      // google: entity_id = Google 用戶 ID, email 存在 user_metadata.email
      const { Client } = require("pg")
      const pgClient = new Client({ connectionString: process.env.DATABASE_URL })
      await pgClient.connect()

      let providerRows: any[] = []
      try {
        const result = await pgClient.query(
          "SELECT provider, entity_id, auth_identity_id, user_metadata FROM provider_identity WHERE entity_id = $1 OR user_metadata->>'email' = $1 LIMIT 5",
          [identifier]
        )
        providerRows = result.rows || []
      } finally {
        await pgClient.end()
      }

      console.log("🔍 查到 provider_identity:", providerRows.length, "筆")

      if (providerRows.length === 0) {
        console.log("⚠️ 找不到認證身份:", customer.id)
        return res.status(201).json({
          message: "If the email exists, a reset link has been sent"
        })
      }

      // 取第一個認證提供者
      const authProvider = providerRows[0].provider
      
      console.log('🔍 客戶認證提供者:', {
        authProvider,
        customerId: customer.id,
        totalIdentities: providerRows.length
      })
      
      // 如果是 Google 用戶，發送 Google 登入提醒
      if (authProvider === 'google') {
        console.log('⚠️ Google 用戶嘗試重設密碼，發送 Google 登入提醒')
        
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/${process.env.DEFAULT_REGION || 'tw'}/account`
        await sendGoogleUserNotificationEmail(identifier, loginUrl)
        
        return res.status(201).json({
          message: 'If the email exists, appropriate login instructions have been sent'
        })
      }
      
      // 如果不是 emailpass 認證，返回通用訊息
      if (authProvider !== 'emailpass') {
        console.log('⚠️ 非 emailpass 認證用戶:', authProvider)
        return res.status(201).json({
          message: 'If the email exists, a reset link has been sent'
        })
      }
      
      // 生成重設令牌（使用時間戳和隨機數）
      const resetToken = Buffer.from(`${customer.id}:${Date.now()}:${Math.random()}`).toString('base64')
      
      // 構建重設 URL (使用動態路由)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8000'
      const defaultRegion = process.env.DEFAULT_REGION || 'tw'
      const resetUrl = `${frontendUrl}/${defaultRegion}/reset-password?token=${resetToken}&email=${encodeURIComponent(identifier)}`
      
      // 發送郵件
      console.log('📧 準備發送密碼重設郵件...')
      console.log('🔗 重設連結:', resetUrl)
      
      const emailResult = await sendPasswordResetEmail(identifier, resetUrl)
      
      console.log('✅ 密碼重設郵件發送結果:', emailResult)
      console.log('📧 郵件已發送至:', identifier)
      
      return res.status(201).json({
        message: 'Password reset email sent successfully'
      })
      
    } catch (authError) {
      console.error('❌ 處理錯誤:', authError)
      
      // 即使發生錯誤，也回傳成功訊息以防止資訊洩露
      return res.status(201).json({
        message: 'If the email exists, a reset link has been sent'
      })
    }
    
  } catch (error) {
    console.error('❌ 密碼重設處理錯誤:', error)
    
    return res.status(500).json({
      error: 'Internal server error during password reset'
    })
  }
}