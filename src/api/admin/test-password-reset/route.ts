import { 
  AuthenticatedMedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * 測試密碼重設通知的 API 端點
 * POST /admin/test-password-reset
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const body = req.body as { 
    email?: string
    actor_type?: 'customer' | 'user'
    token?: string
  }
  const { email, actor_type = 'customer', token } = body

  if (!email) {
    return res.status(400).json({ 
      error: "Missing required field: 'email'" 
    })
  }

  try {
    const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION)
    
    // 生成測試 token（如果未提供）
    const testToken = token || `test_reset_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    let urlPrefix = ""
    let templateId = "password-reset"
    let storeName = "Tim's Fantasy World"

    // 根據用戶類型設定不同的重設 URL 和範本
    if (actor_type === "customer") {
      urlPrefix = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://timsfantasyworld.com"
      templateId = "customer-password-reset"
    } else {
      const backendUrl = process.env.MEDUSA_ADMIN_BACKEND_URL || process.env.MEDUSA_BACKEND_URL || "https://admin.timsfantasyworld.com"
      urlPrefix = `${backendUrl}/app`
      templateId = "admin-password-reset"
    }

    // 建構重設密碼的完整 URL
    const resetUrl = `${urlPrefix}/reset-password?token=${testToken}&email=${encodeURIComponent(email)}`

    console.log(`🧪 測試密碼重設通知`)
    console.log(`📧 收件人: ${email}`)
    console.log(`👤 用戶類型: ${actor_type}`)
    console.log(`📋 使用範本: ${templateId}`)
    console.log(`🔗 重設連結: ${resetUrl}`)
    
    await notificationModuleService.createNotifications({
      to: email,
      channel: "email",
      template: templateId,
      data: {
        email: email,
        reset_url: resetUrl,
        token: testToken,
        actor_type: actor_type,
        store_name: storeName,
        expiry_message: "此連結將在 24 小時後失效",
        security_notice: "如果您沒有要求重設密碼，請忽略此郵件。",
        support_email: "support@timsfantasyworld.com",
        site_url: process.env.FRONTEND_URL || "https://timsfantasyworld.com",
        current_year: new Date().getFullYear(),
        user_type_display: actor_type === "customer" ? "客戶" : "管理員",
      },
    })

    console.log(`✅ 測試密碼重設郵件已發送到: ${email}`)

    res.status(200).json({
      success: true,
      message: `Test password reset email sent to ${email}`,
      details: {
        email,
        actor_type,
        template: templateId,
        reset_url: resetUrl,
        provider: process.env.SENDGRID_API_KEY ? 'SendGrid' : 'Local',
      },
    })

  } catch (error) {
    console.error("❌ 測試密碼重設郵件發送失敗:", error)
    res.status(500).json({
      error: "Failed to send test password reset email",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}