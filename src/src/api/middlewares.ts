// src/api/middlewares.ts
import { defineMiddlewares } from "@medusajs/framework/http"
import * as customHooks from "./custom-hooks"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/custom-hooks/ecpay-callback",
      bodyParser: { preserveRawBody: true },
      method: ["POST"],
      middlewares:[
        customHooks.ecpayCallBack,
      ],
    },
  ],
})