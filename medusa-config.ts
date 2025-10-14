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
const DEFAULT_ADMIN_CORS = 'http://localhost:9000,https://admin.timsfantasyworld.com,http://admin.timsfantasyworld.com'
const DEFAULT_AUTH_CORS = 'http://localhost:8000,http://localhost:9000,https://timsfantasyworld.com,https://admin.timsfantasyworld.com'

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // CORS configuration for different parts of the application
      storeCors: process.env.STORE_CORS || DEFAULT_STORE_CORS,
      adminCors: process.env.ADMIN_CORS || DEFAULT_ADMIN_CORS,
      authCors: process.env.AUTH_CORS || DEFAULT_AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
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
              // 🔧 強制重新授權和帳號選擇的最強參數組合
              prompt: 'consent select_account',  // 同時強制同意和帳號選擇
              access_type: 'offline',            // 離線訪問
              approval_prompt: 'force',          // 強制重新授權
              include_granted_scopes: 'false',   // 不包含已授權的範圍
              // 添加自定義參數強制清除會話
              authorizationParams: {
            prompt: 'consent select_account',
            access_type: 'offline',
            approval_prompt: 'force'
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
            // 若此 provider 位於插件內，改為 plugin-name/providers/my-payment
            resolve: './src/modules/ecpayments',
            id: 'ecpay_credit_card',
            options: {},
          },
        ],
      },
    },
    {
      // File service module
      resolve: '@medusajs/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              upload_dir: 'static',
              backend_url: process.env.BACKEND_URL || 'http://localhost:9000/static',
            },
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
    },

  ],
})
