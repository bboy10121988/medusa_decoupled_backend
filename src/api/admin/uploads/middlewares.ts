import { defineMiddlewares } from "@medusajs/medusa"

/**
 * 覆蓋 Medusa 預設的 Multer middleware
 * 
 * Medusa 內建的 /admin/uploads 路由使用 Multer middleware
 * 這會導致:
 * 1. Buffer 被轉為 binary 字串 (實際上變成 Base64)
 * 2. 檔案儲存為文字而非二進位
 * 
 * 此檔案禁用預設 middleware,讓我們的自訂路由使用 Formidable
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/uploads",
      middlewares: [
        // 空陣列 = 不使用任何 middleware
        // 這樣 route.ts 可以完全控制請求處理
      ],
    },
  ],
})
