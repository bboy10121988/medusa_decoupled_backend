import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Simple test endpoint to check if upload endpoint works
    return res.json({
      message: "Test upload endpoint is working",
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    })
  } catch (error) {
    console.error("Test upload error:", error)
    return res.status(500).json({
      message: "Test failed",
      error: error?.message || "Unknown error"
    })
  }
}
