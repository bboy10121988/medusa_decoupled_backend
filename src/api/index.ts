import { Router } from "express"
import storeRoutes from "./routes/store"

// 設置所有API路由
export default (app, rootDirectory, config) => {
  const router = Router()

  // 添加商店路由
  router.use("/store", storeRoutes(app, rootDirectory, config))

  // 如果需要，可以添加更多路由組...
  // router.use("/admin", adminRoutes())
  
  return router
}