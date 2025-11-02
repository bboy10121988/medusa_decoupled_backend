import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/utils"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const authHeader = req.headers.authorization
  const jwt = authHeader?.split(" ")[1]

  if (!jwt) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "未提供認證令牌"
    )
  }

  try {
    const jwtVerifier = req.scope.resolve("jwtVerifier") as any
    const { actor_id, actor_type } = await jwtVerifier.verifyToken(jwt)

    console.log('🔍 獲取 Google 身份資料 - 已驗證 Token', {
      actor_id,
      actor_type
    })

    if (!actor_id || actor_type !== "customer") {
      return res.status(401).json({
        success: false,
        error: "無效的客戶認證"
      })
    }

    // 獲取數據庫連接
    const dataSource = req.scope.resolve("dbConnection") as any

    // 查詢客戶關聯的 Google 身份
    const results = await dataSource.manager.query(
      `SELECT 
        pi.id,
        pi.provider,
        pi.entity_id,
        pi.user_metadata,
        pi.provider_metadata,
        ai.id as auth_identity_id,
        ai.app_metadata
      FROM 
        public.provider_identity pi
      JOIN 
        public.auth_identity ai ON pi.auth_identity_id = ai.id
      WHERE 
        ai.app_metadata->>'customer_id' = $1 AND pi.provider = 'google'
      ORDER BY 
        pi.created_at DESC 
      LIMIT 1`,
      [actor_id]
    )

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "找不到 Google 身份資料"
      })
    }

    const data = results[0]
    let userData: any = {}

    // 在 Medusa v2 中，user_metadata 已經是 JSON 對象
    userData = data.user_metadata || {}
    const appMetadata = data.app_metadata || {}

    // 提取需要的數據
    const googleIdentity = {
      email: userData.email,
      name: userData.name,
      given_name: userData.given_name,
      family_name: userData.family_name,
      picture: userData.picture,
      provider_user_id: data.entity_id,
      customer_id: appMetadata.customer_id
    }

    return res.status(200).json({
      success: true,
      data: googleIdentity
    })
  } catch (error) {
    console.error("驗證或查詢 Google 身份時出錯:", error)
    
    return res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "未知錯誤"
    })
  }
}