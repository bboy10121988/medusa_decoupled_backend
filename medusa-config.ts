import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

function requiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not defined.`)
  }
  return value
}

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Default CORS settings for development and production
const DEFAULT_STORE_CORS = 'http://localhost:8000,https://timsfantasyworld.com'
const DEFAULT_ADMIN_CORS = "http://localhost:7001,http://localhost:9000,https://admin.timsfantasyworld.com,http://admin.timsfantasyworld.com,http://localhost:8000,http://35.185.142.194:9000"
const DEFAULT_AUTH_CORS = 'http://localhost:8000,http://localhost:9000,https://timsfantasyworld.com,https://admin.timsfantasyworld.com'

module.exports = defineConfig({
  admin: { 
    disable: false,
    backendUrl: "https://admin.timsfantasyworld.com"
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Redis 配置 - 用於會話存儲和緩存
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    http: {
      // CORS configuration for different parts of the application
      storeCors: process.env.STORE_CORS || DEFAULT_STORE_CORS,
      adminCors: process.env.ADMIN_CORS || DEFAULT_ADMIN_CORS,
      authCors: process.env.AUTH_CORS || DEFAULT_AUTH_CORS,
      jwtSecret: 'medusa-jwt-secret-2024-production-key-secure',
      cookieSecret: 'medusa-cookie-secret-2024-production-key-secure',
      // 🔐 定義不同角色可使用的認證方法
      authMethodsPerActor: {
        customer: ['emailpass', 'google'], // 顧客使用 Email/Password 或 Google 登入
        user: ['emailpass'],               // 管理員使用 Email/Password 登入
      },
    }
  },
  modules: [
    {
      resolve: '@medusajs/auth',
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: [
          // Email/Password Provider
          {
            resolve: '@medusajs/auth-emailpass',
            id: 'emailpass',
          },
          // Google OAuth Provider
          {
            resolve: '@medusajs/auth-google',
            id: 'google',
            options: {
              clientId: requiredEnv('GOOGLE_CLIENT_ID'),
              clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
              callbackUrl: requiredEnv('GOOGLE_CALLBACK_URL'),
              // ✅ Medusa v2 verify callback
              verify: async (container, req, accessToken, refreshToken, profile, done) => {
                console.log("=== Google OAuth Callback ===")
                console.log("Profile:", JSON.stringify(profile._json, null, 2))
                
                const { email, given_name, family_name, picture, sub: googleUserId } = profile._json
                
                if (!email) {
                  console.error("❌ Google profile missing email")
                  return done(null, false, { message: 'Google profile did not return an email.' })
                }
                
                try {
                  // 使用 Medusa v2 的 query API 檢查用戶是否存在
                  const query = container.resolve("query")
                  const { data: customers } = await query.graph({
                    entity: "customer",
                    fields: ["id", "email", "first_name", "last_name", "has_account"],
                    filters: { email },
                  })
                  
                  if (customers && customers.length > 0) {
                    console.log(`✅ Google Auth: Customer ${email} already exists. Logging in.`)
                    return done(null, customers[0])
                  }
                  
                  // 使用 Medusa v2 的 workflow 創建新用戶
                  console.log(`➕ Google Auth: Creating new customer for ${email}...`)
                  const createCustomersWorkflow = container.resolve("createCustomersWorkflow")
                  
                  const { result } = await createCustomersWorkflow.run({
                    input: {
                      customers: [{
                        email,
                        first_name: given_name || '',
                        last_name: family_name || '',
                        has_account: true,
                        metadata: {
                          auth_provider: 'google',
                          google_user_id: googleUserId,
                          picture,
                        }
                      }]
                    }
                  })
                  
                  const newCustomer = result[0]
                  console.log(`✅ Google Auth: New customer created: ${newCustomer.id}`)
                  
                  return done(null, newCustomer)
                  
                } catch (error) {
                  console.error("❌ Google Auth: Error in verify callback", error)
                  console.error("Error details:", error.stack)
                  return done(error, false)
                }
              }
            },
          },
        ],
      },
    },
    /* 不需要再顯式設定 API 路由，
       Medusa 已經會自動從 src/api 目錄加載路由
       參考 @medusajs/medusa/dist/loaders/api.js 中的邏輯
       先刪除這個配置項，讓系統默認加載 */
    {
      // Payment provider module
      resolve: '@medusajs/payment',
      options: {
        providers: [
          {
            // ECPay 信用卡支付
            resolve: './src/modules/ecpayments',
            id: 'ecpay_credit_card',
            options: {},
          },
        ],
      },
    },
    {
      // Notification module - 使用 Local 提供者（Resend 透過自定義訂閱者處理）
      resolve: '@medusajs/notification',
      options: {
        providers: [
          // Local Provider - 實際郵件透過 Resend 在訂閱者中發送
          {
            resolve: '@medusajs/notification-local',
            id: 'local',
            options: {
              channels: ['email'],
            },
          }
        ],
      },
    },    {
      // Redis 緩存模組 - 提升性能
      resolve: '@medusajs/cache-redis',
      key: Modules.CACHE,
      options: {
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    },
    {
      // File service 配置 - 配合 file-local 的路徑處理
      resolve: '@medusajs/file',
      key: Modules.FILE,
      options: {
        providers: [
          {
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              // backend_url 是基礎 URL，file-local 會自動加上檔案的相對路徑
              // 例如：backend_url + '/uploads/filename.jpg' -> https://admin.timsfantasyworld.com/static/uploads/filename.jpg
              backend_url: (process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com') + '/static',
              // upload_dir 是實際存儲目錄（相對於專案根目錄）
              // 檔案會存到: ./static/uploads/filename.jpg
              upload_dir: 'static/uploads',
            },
          },
        ],
      },
    },

  ],
})
