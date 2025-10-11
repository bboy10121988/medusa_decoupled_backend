import { Router } from "express"
import cors from "cors"
import googleProfileRouter from "./auth/google-profile-router"

export default (app, rootDirectory, config) => {
  const corsOptions = {
    origin: config.projectConfig.store_cors.split(","),
    credentials: true,
  }

  const router = Router()
  
  // 使用CORS中間件
  router.use(cors(corsOptions))
  
  // 添加Google資料路由
  router.use("/", googleProfileRouter())
  
  // 如果需要，可以添加更多自定義路由...
  
  return router
}