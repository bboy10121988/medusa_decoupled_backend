import { Router } from "express"
import googleProfileRouter from "./auth/google-profile-router"
import googleCallbackRouter from "./auth/google-callback-router"

export default (app, rootDirectory, config) => {
  const router = Router()
  
  // 添加Google資料路由
  router.use("/", googleProfileRouter())
  
  // 添加Google OAuth callback路由
  router.use("/", googleCallbackRouter())
  
  // 如果需要，可以添加更多自定義路由...
  
  return router
}