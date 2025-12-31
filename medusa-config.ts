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

export default defineConfig({
  admin: {
    disable: true,
    backendUrl: "https://admin.timsfantasyworld.com",
    vite: (config) => {
      return {
        ...config,
        server: {
          ...config.server,
          allowedHosts: ['admin.timsfantasyworld.com', '.timsfantasyworld.com', 'localhost'],
        },
      }
    },
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
          // Google Oauth ProviderV2
          {
            resolve: "@medusajs/auth-google",
            id: "google",
            options: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'https://timsfantasyworld.com/auth/google/callback',
            },
          },
          // // Google OAuth Provider
          // {
          //   resolve: '@medusajs/auth-google',
          //   id: 'google',
          //   options: {
          //     clientId: process.env.GOOGLE_CLIENT_ID || '',
          //     clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          //     callbackUrl: (() => {
          //       const url = process.env.GOOGLE_CALLBACK_URL || 'https://admin.timsfantasyworld.com/auth/customer/google/callback'
          //       return url
          //     })(),
          //     // ✅ Medusa v2 verify callback
          //     verify: async (container, req, accessToken, refreshToken, profile, done) => {
          //       // 強制寫入 /tmp 下唯一的 debug log
          //       const fs = require('fs');
          //       function log(message) {
          //         try {
          //           const time = new Date().toISOString();
          //           fs.appendFileSync('/tmp/medusa-auth-debug.log', `[${time}] ${message}\n`);
          //         } catch (err) {
          //           console.error("Failed to write log:", err);
          //         }
          //       }

          //       log("🚀 Google Verify Callback STARTED 🚀");
          //       try {
          //         log("Container available: " + (!!container));
          //         log("Profile ID: " + (profile?.id || 'unknown'));
          //       } catch (e) {
          //         log("Error in initial logging: " + e.message);
          //       }

          //       // --- 原本的邏輯 ---

          //       // 處理 profile 結構可能不同的情況
          //       const json = profile._json || profile;
          //       const email = json.email;
          //       const given_name = json.given_name;
          //       const family_name = json.family_name;
          //       const picture = json.picture;
          //       const googleUserId = json.sub || json.id;

          //       if (!email) {
          //         log("❌ Google profile missing email")
          //         return done(null, false, { message: 'Google profile did not return an email.' })
          //       }

          //       try {
          //         // 使用 Medusa v2 的 query API 檢查用戶是否存在
          //         const query = container.resolve("query")
          //         const { data: customers } = await query.graph({
          //           entity: "customer",
          //           fields: ["id", "email", "first_name", "last_name", "has_account"],
          //           filters: { email },
          //         })

          //         if (customers && customers.length > 0) {
          //           log(`✅ Google Auth: Customer ${email} already exists. Logging in.`)
          //           return done(null, customers[0])
          //         }

          //         // 使用 Medusa v2 的 workflow 創建新用戶
          //         log(`➕ Google Auth: Creating new customer for ${email}...`)

          //         const { createCustomersWorkflow } = require('@medusajs/core-flows');
          //         // 注意: createCustomersWorkflow 需要傳入 container 或 invoke
          //         // 這裡嘗試直接傳入 container

          //         log("Running createCustomersWorkflow...")
          //         const { result } = await createCustomersWorkflow(container).run({
          //           input: {
          //             customersData: [{
          //               email,
          //               first_name: given_name || '',
          //               last_name: family_name || '',
          //               has_account: true,
          //               metadata: {
          //                 auth_provider: 'google',
          //                 google_user_id: googleUserId,
          //                 picture,
          //               }
          //             }]
          //           }
          //         })

          //         const newCustomer = result[0]
          //         log(`✅ Google Auth: New customer created: ${newCustomer.id}`)

          //         return done(null, newCustomer)

          //       } catch (error) {
          //         log("❌ Google Auth: Error in verify callback: " + error.message)
          //         log("Stack: " + error.stack)
          //         return done(error, false)
          //       }
          //     }
          //   },
          // },
        ],
      },
    },
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
    }, {
      // Redis 緩存模組 - 提升性能
      resolve: '@medusajs/cache-redis',
      key: Modules.CACHE,
      options: {
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    },
    {
      // File service 配置
      // ⚠️ file-local 的 URL 生成邏輯：backend_url + '/' + fileKey
      // fileKey 只包含檔案名稱，不含 upload_dir 路徑
      // 因此 backend_url 必須包含完整的 URL 路徑前綴
      resolve: '@medusajs/file',
      key: Modules.FILE,
      options: {
        providers: [
          {
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              // 檔案實際存儲位置（相對於專案根目錄）
              upload_dir: 'static/uploads',
              // URL 前綴（必須包含完整路徑，因為 file-local 只會在後面加檔案名稱）
              backend_url: (process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com') + '/static/uploads',
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/affiliate",
    },
  ],
})
