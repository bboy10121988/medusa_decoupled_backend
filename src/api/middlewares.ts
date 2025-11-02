// src/api/middlewares.ts
import { defineMiddlewares,
  errorHandler,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import * as customHooks from "./custom-hooks"
import express from "express"
import path from "path"
import routes from "./index" // 導入我們的自定義路由
import { MedusaError } from "@medusajs/framework/utils"

const originalErrorHandler = errorHandler()

export default defineMiddlewares({
  errorHandler: (
    error: MedusaError | any,
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {

    console.log("middleware catched error:",error)
    console.log("error path:",req.path)



    // order退款錯誤：
    // 攔截 Admin API 的退款請求
    // Admin API 路徑通常是 /admin/payments/{id}/refund
    // const adminPaymentRefundPattern = /^\/admin\/payments\/pay_[A-Z0-9]{26}\/refund$/
    if (req.path.match(/^\/admin\/payments\/pay_[A-Z0-9]{26}\/refund$/)) {

      console.log("捕捉到退款路由的錯誤處理：",error)

      switch(error.message){

        case "信用卡退款查詢無法取得訂單狀態":
          console.log("信用卡退款查詢無法取得訂單狀態")
          res.status(500).json({
            code: "'api_error'",
            type: "not_found",
            error: "退款處理失敗",
            message: "退款處理失敗，根據綠界文件：請過30分鐘後再試",
          })

          return
        case "Order does not have an outstanding balance to refund":
          console.log("訂單未執行完畢")
          res.status(500).json({
            code: "'api_error'",
            type: "not_found",
            error: "訂單未執行完畢",
            message: "訂單未執行完畢，無法退款：請先執行退貨或是取消訂單才能進行退款",
          })

          return

      }

      // if (error.message === '信用卡退款查詢無法取得訂單狀態'){

      //   console.log("捕捉到退款時的 unknown_error 錯誤，回傳自定義訊息給前端")

      //   res.status(500).json({
      //     code: "'api_error'",
      //     type: "not_found",
      //     error: "退款處理失敗",
      //     message: "退款處理失敗，根據綠界文件：請過30分鐘後再試",
      //   })

      //   return
      // }
    }    



    // if (req.path.includes('/refund')) {
    //   if (error.type === "unknown_error"){

    //     console.log("捕捉到退款時的 unknown_error 錯誤，回傳自定義訊息給前端")

    //     res.status(500).json({
    //       code: "'api_error'",
    //       type: "not_found",
    //       error: "退款處理失敗",
    //       message: "退款處理失敗，根據綠界文件：請過30分鐘後再試",
    //     })

    //     return
    //   }

    // }



    // const refundRoutePattern = /\/orders\/[^/]+\/refund/
    // if (refundRoutePattern.test(req.path)) {

    //   if (error.type === "unknown_error"){

    //     console.log("捕捉到退款時的 unknown_error 錯誤，回傳自定義訊息給前端")

    //     res.status(500).json({
    //       code: "'api_error'",
    //       type: "not_found",
    //       error: "退款處理失敗",
    //       message: "退款處理失敗，根據綠界文件：請過30分鐘後再試",
    //     })
    //     return
    //   }

    // }

    
    // 對於其他錯誤,使用原始的錯誤處理器
    return originalErrorHandler(error, req, res, next)
  },
  
  routes: [
    {
      matcher: "/store/auth/google/me",
      method: ["GET"],
      middlewares: [
        // 註冊我們的自定義 API 路由(舊版自定義路由)
        (req, res, next) => {
          return routes(req.app, process.cwd(), {})(req, res, next)
        }
      ],
    },
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