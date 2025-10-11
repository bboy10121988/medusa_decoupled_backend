import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || 'http://localhost:3000',
      adminCors: process.env.ADMIN_CORS || 'http://localhost:9000',
      authCors: process.env.AUTH_CORS || 'http://localhost:3000,http://localhost:9000',
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
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackUrl: process.env.GOOGLE_CALLBACK_URL,
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
      // 新增payment provider
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
      // 檔案服務模組
      resolve: '@medusajs/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              upload_dir: 'static',
              backend_url: 'http://35.236.182.29:9000/static',
            },
          },
        ],
      },
    },
    {
      // 通知模組 - 用於密碼重置電子郵件
      resolve: '@medusajs/notification',
      options: {
        providers: [
          {
            resolve: '@medusajs/notification-local',
            id: 'local',
            options: {
              channels: ['email'],
            },
          },
        ],
      },
    },

  ],
})
