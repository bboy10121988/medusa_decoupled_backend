import { Router } from "express"

export default function getGoogleProfileRouter() {
  const router = Router()

  router.get(
    "/store/auth/google/me",
    // 確保需要身份驗證
    async (req: any, res) => {
      try {
        // 1. 檢查是否有認證信息
        if (!req.user || !req.user.customer_id) {
          return res.status(401).json({
            success: false,
            message: "未認證或未找到客戶ID",
          })
        }

        const customerId = req.user.customer_id
        console.log(`接收到Google資料請求，客戶ID: ${customerId}`)
        
        // 2. 獲取數據庫實例
        const manager = req.scope.resolve("manager")
        
        // 3. 查詢該客戶關聯的Google OAuth資料
        // 先從auth_identity表檢索，然後關聯到provider_identity表
        const query = `
          SELECT 
            pi.id,
            pi.provider,
            pi.entity_id as provider_user_id,
            pi.user_metadata,
            pi.provider_metadata,
            ai.app_metadata
          FROM auth_identity ai 
          JOIN provider_identity pi ON ai.id = pi.auth_identity_id
          WHERE ai.app_metadata->>'customer_id' = $1 AND pi.provider = 'google'
          ORDER BY pi.created_at DESC 
          LIMIT 1
        `
        
        const result = await manager.query(query, [customerId])
        
        if (!result || result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "未找到此客戶的Google資料",
          })
        }
        
        const googleData = result[0]
        
        // 從user_metadata中提取有用資訊
        const userMetadata = googleData.user_metadata || {}
        
        // 返回相關資料
        return res.status(200).json({
          success: true,
          data: {
            provider: "google",
            email: userMetadata.email,
            name: userMetadata.name,
            given_name: userMetadata.given_name,
            family_name: userMetadata.family_name,
            picture: userMetadata.picture,
          }
        })
        
      } catch (error) {
        console.error("獲取Google資料時出錯:", error)
        return res.status(500).json({
          success: false,
          message: "處理請求時出錯",
          error: error.message,
        })
      }
    }
  )

  return router
}