import { defineMiddlewares } from "@medusajs/medusa"

/**
 * 覆蓋 Medusa 預設的 Multer middleware
 * 
 * 這個檔案禁用了 Medusa 內建的上傳 middleware,
 * 允許我們的自訂 Formidable 路由正常工作
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/uploads",
      middlewares: [
        // 空陣列 = 不使用任何 middleware
        // 這樣我們的 route.ts 可以完全控制請求處理
      ],
    },
  ],
})