import { 
  AuthenticatedMedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * 測試電子郵件發送的 API 端點
 * POST /admin/test-email
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const body = req.body as { to?: string; template?: string; data?: any }
  const { to, template, data } = body

  if (!to || !template) {
    return res.status(400).json({ 
      error: "Missing required fields: 'to' and 'template'" 
    })
  }

  try {
    const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION)
    
    await notificationModuleService.createNotifications({
      to,
      channel: "email",
      template,
      data: data || {
        test_message: "這是一個測試電子郵件",
        timestamp: new Date().toISOString(),
        store_name: "Tim's Fantasy World",
      },
    })

    console.log(`📧 測試郵件已發送到: ${to}`)

    res.status(200).json({
      success: true,
      message: `Test email sent to ${to} with template ${template}`,
      provider: process.env.SENDGRID_API_KEY ? 'SendGrid' : 'Local',
    })

  } catch (error) {
    console.error("❌ 測試郵件發送失敗:", error)
    res.status(500).json({
      error: "Failed to send test email",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}