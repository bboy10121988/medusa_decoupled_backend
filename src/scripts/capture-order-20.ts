import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows"

export default async function captureOrder20({ container }: ExecArgs) {
    const orderId = "order_01KDAZ5A4KSGN85KRCA3NHCJWB"
    const paymentId = "pay_01KDAZ5A9M7RJWDQ7QBCGTDAQC"
    const amount = 570

    console.log(`\n=== Manually Capturing Payment for Order #20 ===`)
    console.log(`Order ID: ${orderId}`)
    console.log(`Payment ID: ${paymentId}`)
    console.log(`Amount: ${amount}`)

    try {
        const { result } = await capturePaymentWorkflow(container).run({
            input: {
                payment_id: paymentId,
                amount: amount
            }
        })

        console.log("✅ Capture successful!")
        console.log("Result:", JSON.stringify(result, null, 2))
    } catch (err) {
        console.error("❌ Capture failed:", err.message)
    }
}
