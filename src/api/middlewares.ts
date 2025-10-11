// src/api/middlewares.ts
import { defineMiddlewares } from "@medusajs/framework/http"
import * as customHooks from "./custom-hooks"
import express from "express"
import path from "path"

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