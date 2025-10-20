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
const DEFAULT_ADMIN_CORS = 'http://localhost:9000,https://admin.timsfantasyworld.com,http://admin.timsfantasyworld.com,http://localhost:8000'
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
  admin: {
    vite: (config) => {
      config.server = config.server || {}
      config.server.allowedHosts = [
        'admin.timsfantasyworld.com',
        'localhost',
        '127.0.0.1'
      ]
      return config
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
              callbackUrl: requiredEnv('GOOGLE_CALLBACK_URL'), // 確保這個 URL 指向後端，例如 http://localhost:9000/auth/google/cb
              // 🔧 強制 Google 顯示帳號選擇畫面的參數，直接放在 options 層級
              // prompt: 'consent select_account',
              // access_type: 'offline',
              // ✅ 正確的位置：verify 函式應定義在對應 provider 的 options 內部
              verify: async (container, req, accessToken, refreshToken, profile, done) => {
                // 從 Google profile 中解析出使用者資料
                const { email, given_name, family_name, picture } = profile._json;


                console.log ("Google Auth: Profile data received", profile._json);

                // 如果 Google 沒有回傳 email，則拒絕登入
                if (!email) {
                  return done(null, false, { message: 'Google profile did not return an email.' });
                }
                // 使用 Medusa 的依賴注入容器來取得 CustomerService
                const customerService = container.resolve('customerService');
                try {
                  // 1. 檢查此 email 的顧客是否已存在
                  let customer = await customerService.retrieveByEmail(email).catch(() => undefined);
                  if (customer) {
                    // 2. 如果顧客已存在，直接回傳顧客物件，完成登入
                    console.log(`Google Auth: Customer ${email} already exists. Logging in.`);
                    return done(null, customer);
                  }
                  // 3. 如果顧客不存在，建立一個新的顧客
                  console.log(`Google Auth: Customer ${email} does not exist. Creating new customer.`);
                  const newCustomer = await customerService.create({
                    email: email,
                    first_name: given_name || '',
                    last_name: family_name || '',
                    // 可以在 metadata 中儲存額外資訊
                    metadata: {
                      auth_provider: 'google',
                      picture: picture
                    }
                  });
                  // 4. 回傳新建立的顧客物件，完成註冊並登入
                  return done(null, newCustomer);
                }
                catch (error) {
                  console.error("Google Auth: Error in verify callback", error);
                  return done(error, false);
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
