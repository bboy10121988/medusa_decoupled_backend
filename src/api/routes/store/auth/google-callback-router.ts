import { Router } from "express"
import { OAuth2Client } from "google-auth-library"

export default function googleCallbackRouter() {
  const router = Router()

  router.post("/auth/google/callback", async (req: any, res) => {
    const { code } = req.body

    // 驗證必要參數
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Missing authorization code"
      })
    }

    try {
      // 初始化 Google OAuth2 Client
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL
      )

      // 1. 用 code 換取 tokens
      console.log("🔄 Exchanging authorization code for tokens...")
      const { tokens } = await oauth2Client.getToken(code)
      
      if (!tokens.access_token) {
        throw new Error("Failed to get access token from Google")
      }

      oauth2Client.setCredentials(tokens)

      // 2. 用 access token 獲取用戶資料
      console.log("👤 Fetching user info from Google...")
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      })

      const payload = ticket.getPayload()
      
      if (!payload || !payload.email) {
        throw new Error("Failed to get user email from Google")
      }

      const { email, given_name, family_name, picture, sub: googleUserId } = payload

      console.log(`✅ Google user authenticated: ${email}`)

      // 3. 獲取 Medusa services
      const query = req.scope.resolve("query")
      
      // 4. 檢查用戶是否已存在
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email", "first_name", "last_name", "has_account"],
        filters: { email },
      })

      let customerId: string
      let isNewCustomer = false

      if (customers && customers.length > 0) {
        // 用戶已存在
        customerId = customers[0].id
        console.log(`👤 Existing customer found: ${customerId}`)
      } else {
        // 創建新用戶
        console.log(`➕ Creating new customer for ${email}...`)
        
        const createCustomerWorkflow = req.scope.resolve("createCustomersWorkflow")
        const { result } = await createCustomerWorkflow.run({
          input: {
            customers: [{
              email,
              first_name: given_name || "",
              last_name: family_name || "",
              has_account: true,
              metadata: {
                auth_provider: "google",
                google_user_id: googleUserId,
                picture,
              },
            }],
          },
        })

        customerId = result[0].id
        isNewCustomer = true
        console.log(`✅ New customer created: ${customerId}`)
      }

      // 5. 檢查/創建 auth_identity 和 provider_identity
      const authModuleService = req.scope.resolve("authModuleService")
      
      // 查找是否已有 Google provider identity
      const existingIdentity = await authModuleService.listProviderIdentities({
        provider: "google",
        entity_id: customerId,
      })

      let authIdentity

      if (existingIdentity && existingIdentity.length > 0) {
        // 已存在 Google identity,獲取對應的 auth_identity
        const providerIdentity = existingIdentity[0]
        authIdentity = await authModuleService.retrieveAuthIdentity(
          providerIdentity.auth_identity_id
        )
        console.log(`🔑 Existing auth identity found: ${authIdentity.id}`)
      } else {
        // 創建新的 auth_identity 和 provider_identity
        console.log(`➕ Creating new auth identity for customer ${customerId}...`)
        
        authIdentity = await authModuleService.createAuthIdentities({
          provider_identities: [{
            provider: "google",
            entity_id: customerId,
            provider_metadata: {
              email,
              given_name,
              family_name,
              picture,
              google_user_id: googleUserId,
            },
          }],
        })

        console.log(`✅ New auth identity created: ${authIdentity.id}`)
      }

      // 6. 生成 JWT token
      console.log("🔐 Generating JWT token...")
      const jwtService = req.scope.resolve("jwt")
      
      const token = jwtService.generate({
        actor_id: customerId,
        actor_type: "customer",
        auth_identity_id: authIdentity.id,
        app_metadata: {
          customer_id: customerId,
        },
      })

      // 7. 返回結果
      console.log(`✅ OAuth login successful for ${email}`)
      
      return res.status(200).json({
        success: true,
        token,
        customer: {
          id: customerId,
          email,
          first_name: given_name || "",
          last_name: family_name || "",
          picture,
        },
        is_new_customer: isNewCustomer,
      })

    } catch (error) {
      console.error("❌ Google OAuth callback error:", error)
      
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error during OAuth",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      })
    }
  })

  return router
}
