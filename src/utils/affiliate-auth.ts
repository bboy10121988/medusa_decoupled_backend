import jwt from "jsonwebtoken"
import { MedusaRequest } from "@medusajs/framework/http"

const JWT_SECRET = process.env.JWT_SECRET || "medusa-affiliate-secret-key"

export function generateAffiliateToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" })
}

export function verifyAffiliateToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (e) {
    return null
  }
}

export function getAffiliateFromRequest(req: MedusaRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  const token = authHeader.split(" ")[1]
  return verifyAffiliateToken(token) as any
}
