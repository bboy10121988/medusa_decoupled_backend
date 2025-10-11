import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const AUTHENTICATE = false

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    console.log('🔑 收到 JWT token 生成請求')
    console.log('📋 Body:', req.body)
    
    const { auth_identity_id } = req.body as { auth_identity_id?: string }
    
    if (!auth_identity_id) {
      return res.status(400).json({
        error: 'Missing auth_identity_id'
      })
    }
    
    const authModuleService = req.scope.resolve("auth")
    
    // 取得 auth identity
    const authIdentity = await authModuleService.retrieveAuthIdentity(auth_identity_id)
    
    if (!authIdentity) {
      console.error('❌ Auth identity not found:', auth_identity_id)
      return res.status(404).json({
        error: 'Auth identity not found'
      })
    }
    
    console.log('✅ 找到 auth identity:', authIdentity.id)
    
    // 生成 JWT token
    // 在 Medusa v2 中,我們需要使用正確的方法
    // 實際上,對於 OAuth,token 應該在 callback 時就已經設置好了
    // 這個端點主要是確保 session 正確
    
    // 設置 session
    ;(req as any).session = {
      auth_identity_id: authIdentity.id,
      actor_id: (authIdentity as any).entity_id,
      actor_type: 'customer',
    }
    
    console.log('🔐 Session 已設置')
    
    // 對於 Medusa v2,我們返回成功狀態
    // 實際的認證通過 session cookie 處理
    return res.status(200).json({
      success: true,
      message: 'Authentication successful'
    })
    
  } catch (error: any) {
    console.error("❌ Token generation error:", error)
    return res.status(500).json({
      error: error.message || 'Failed to generate token'
    })
  }
}
