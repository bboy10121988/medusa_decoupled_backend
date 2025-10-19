import { Router } from "express"
import googleProfileRouter from "./auth/google-profile-router"

export default (app, rootDirectory, config) => {
  const router = Router()
  
  // 添加Google資料路由
  router.use("/", googleProfileRouter())
  
  // 如果需要，可以添加更多自定義路由...
  
  return router
}