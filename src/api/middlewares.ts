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
      matcher: "/google-auth/callback",
      method: ["POST"],
      middlewares: [
        // Google OAuth callback - 直接處理
        async (req: any, res: any) => {
          const { OAuth2Client } = await import("google-auth-library")
          const { code } = req.body

          if (!code) {
            return res.status(400).json({
              success: false,
              message: "Missing authorization code"
            })
          }

          try {
            const oauth2Client = new OAuth2Client(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET,
              process.env.GOOGLE_CALLBACK_URL
            )

            const { tokens } = await oauth2Client.getToken(code)
            if (!tokens.access_token) {
              throw new Error("Failed to get access token from Google")
            }

            oauth2Client.setCredentials(tokens)

            const ticket = await oauth2Client.verifyIdToken({
              idToken: tokens.id_token!,
              audience: process.env.GOOGLE_CLIENT_ID,
            })

            const payload = ticket.getPayload()
            if (!payload || !payload.email) {
              throw new Error("Failed to get user email from Google")
            }

            const { email, given_name, family_name, picture, sub: googleUserId } = payload

            const query = req.scope.resolve("query")
            const { data: customers } = await query.graph({
              entity: "customer",
              fields: ["id", "email", "first_name", "last_name", "has_account"],
              filters: { email },
            })

            let customerId: string
            let isNewCustomer = false

            if (customers && customers.length > 0) {
              customerId = customers[0].id
            } else {
              const createCustomerWorkflow = req.scope.resolve("createCustomersWorkflow")
              const { result } = await createCustomerWorkflow.run({
                input: {
                  customers: [{
                    email,
                    first_name: given_name || "",
                    last_name: family_name || "",
                    has_account: true,
                    metadata: {
                      auth_provider: "google",
                      google_user_id: googleUserId,
                      picture,
                    },
                  }],
                },
              })
              customerId = result[0].id
              isNewCustomer = true
            }

            const authModuleService = req.scope.resolve("authModuleService")
            const existingIdentity = await authModuleService.listProviderIdentities({
              provider: "google",
              entity_id: customerId,
            })

            let authIdentity
            if (existingIdentity && existingIdentity.length > 0) {
              const providerIdentity = existingIdentity[0]
              authIdentity = await authModuleService.retrieveAuthIdentity(
                providerIdentity.auth_identity_id
              )
            } else {
              authIdentity = await authModuleService.createAuthIdentities({
                provider_identities: [{
                  provider: "google",
                  entity_id: customerId,
                  provider_metadata: {
                    email,
                    given_name,
                    family_name,
                    picture,
                    google_user_id: googleUserId,
                  },
                }],
              })
            }

            const jwtService = req.scope.resolve("jwt")
            const token = jwtService.generate({
              actor_id: customerId,
              actor_type: "customer",
              auth_identity_id: authIdentity.id,
              app_metadata: {
                customer_id: customerId,
              },
            })

            return res.status(200).json({
              success: true,
              token,
              customer: {
                id: customerId,
                email,
                first_name: given_name || "",
                last_name: family_name || "",
                picture,
              },
              is_new_customer: isNewCustomer,
            })
          } catch (error) {
            console.error("❌ Google OAuth callback error:", error)
            return res.status(500).json({
              success: false,
              message: error instanceof Error ? error.message : "Internal server error during OAuth",
            })
          }
        }
      ],
    },
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