import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /auth/customer/google
 *
 * 兼容舊有 Medusa middleware 的行為：
 * - 生成 random state 並儲存在 session
 * - 回傳 307 redirect 到 Google OAuth URL
 *
 * 目的：當瀏覽器直接導向此 endpoint 時，server 會設定 session cookie 並
 * 立刻重導至 Google，確保後續 callback 時能夠從同一個 session 讀到 state。
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // 產生一個 secure 的 state
    const state = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 32)

    // 確保 session 可用
    if (!req.session) {
      // 在某些環境下 session middleware 可能尚未初始化
      console.warn('Session object not found on request.');
    } else {
      // 將 state 存進 session
      (req.session as any).oauth_state = state
      // 若需要，可在 session 中記錄其他 metadata
      (req.session as any).oauth_provider = 'google'
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'https://admin.timsfantasyworld.com/auth/customer/google/callback'

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state
    })

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    // 使用 307 保留 HTTP method (GET) 行為
    return res.redirect(307, googleAuthUrl)

  } catch (error) {
    console.error('Error initiating Google OAuth redirect:', error)
    const frontendUrl = process.env.FRONTEND_URL || 'https://timsfantasyworld.com'
    return res.redirect(`${frontendUrl}/tw/auth/google/callback?error=init_failure`)
  }
}

export const AUTHENTICATE = false
