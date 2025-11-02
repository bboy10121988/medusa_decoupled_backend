import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const AUTHENTICATE = false

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  res.json({
    message: "Test endpoint works!",
    path: req.path
  })
}
