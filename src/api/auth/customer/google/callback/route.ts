import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse
} from "@medusajs/framework/http"

/**
 * GET /auth/customer/google/callback
 * 
 * Medusa v2 標準的 Google OAuth callback 端點
 * 
 * 這個端點由 @medusajs/auth-google middleware 自動處理
 * 當 Google 重定向回來時,middleware 會:
 * 1. 驗證 state (CSRF protection)
 * 2. 用 code 交換 access token
 * 3. 呼叫我們在 medusa-config.ts 中定義的 verify callback
 * 4. 建立/查找 customer
 * 5. 建立 auth session
 * 
 * 我們在這裡的工作是:
 * 1. 從 middleware 處理後的結果取得 auth token
 * 2. 設定 HTTP-only cookie
 * 3. 重定向回前端
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    console.log("=== /auth/customer/google/callback ===")
    console.log("Query params:", req.query)
    console.log("Auth context:", (req as any).auth_context)
    console.log("Session:", (req as any).session)

    // Medusa v2 auth middleware 處理後,會在 req 中設定這些屬性
    const auth = (req as AuthenticatedMedusaRequest).auth_context

    if (!auth) {
      console.error("❌ No auth_context found - OAuth might have failed")
      const frontendUrl = process.env.FRONTEND_URL || 'https://timsfantasyworld.com'
      return res.redirect(
        `${frontendUrl}/tw/auth/google/callback?error=no_auth_context`
      )
    }

    console.log("✅ Auth context found:", {
      actor_id: auth.actor_id,
      actor_type: auth.actor_type,
      auth_identity_id: auth.auth_identity_id
    })

    // 從 JWT service 產生 token
    const jwtService = req.scope.resolve("jwt") as any
    const token = jwtService.generate({
      actor_id: auth.actor_id,
      actor_type: auth.actor_type,
      auth_identity_id: auth.auth_identity_id,
      app_metadata: {
        customer_id: auth.actor_id
      }
    })

    console.log("🔐 JWT token generated")
    console.log("🍪 Setting cookie...")

    // 設定 HTTP-only cookie (這是關鍵!)
    res.cookie('_medusa_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // 允許從 Google 跳轉時攜帶
      domain: '.timsfantasyworld.com', // 跨子網域共享
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 天
    })

    console.log("✅ Cookie set successfully")

    // 重定向回前端 (帶上成功狀態)
    const frontendUrl = process.env.FRONTEND_URL || 'https://timsfantasyworld.com'
    const redirectUrl = `${frontendUrl}/tw/auth/google/callback?success=true`

    console.log("📤 Redirecting to:", redirectUrl)
    return res.redirect(redirectUrl)

  } catch (error) {
    const fs = require('fs');
    try {
      fs.appendFileSync('/tmp/medusa-auth-debug.log', `[${new Date().toISOString()}] ❌ Route Handler Error: ${error}\nStack: ${error.stack}\n`);
    } catch (e) { }

    console.error("❌ OAuth callback error:", error)
    console.error("Stack:", error instanceof Error ? error.stack : 'Unknown')

    const frontendUrl = process.env.FRONTEND_URL || 'https://timsfantasyworld.com'
    return res.redirect(
      `${frontendUrl}/tw/auth/google/callback?error=server_error`
    )
  }
}

// 這個端點不應該被 Medusa 的標準認證 middleware 保護
// 因為它是 OAuth flow 的一部分
export const AUTHENTICATE = false
