// src/api/middlewares.ts
import { defineMiddlewares } from "@medusajs/framework/http"
import * as customHooks from "./custom-hooks"
import express from "express"
import path from "path"
import routes from "./index" // 導入我們的自定義路由

export default defineMiddlewares({
  // 全局中間件 - 將應用到所有路由
  global: [
    // 註冊我們的自定義 API 路由
    (req, res, next) => {
      if (req.path.startsWith('/store/auth/google/me')) {
        return routes(req.app, process.cwd(), {})(req, res, next)
      }
      next()
    }
  ],
  routes: [
    {
      matcher: "/custom-hooks/ecpay-callback",
      bodyParser: { preserveRawBody: true },
      method: ["POST"],
      middlewares:[
        customHooks.ecpayCallBack,
      ],
    },
    {
      matcher: "/static/*",
      method: ["GET"],
      middlewares: [
        express.static(path.join(process.cwd(), "static"), {
          fallthrough: false,
          index: false,
        }),
      ],
    },
  ],
})