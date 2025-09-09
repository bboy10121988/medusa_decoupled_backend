import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || '',
      adminCors: process.env.ADMIN_CORS || '',
      authCors: process.env.AUTH_CORS || '',
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    }
  },
  modules: [
    {
      // 新增payment provider
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            // 若此 provider 位於插件內，改為 plugin-name/providers/my-payment
            resolve: "./src/modules/ecpayments",
            id: "ecpay_credit_card",
            options: {},
          },
        ],
      },
    },
    {
      // 新增檔案模組 - 本地檔案儲存
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              upload_dir: "uploads",
              backend_url: process.env.BACKEND_URL || "http://localhost:9000",
            },
          },
        ],
      },
    },
  ],
})
