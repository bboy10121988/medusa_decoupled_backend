import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { sendEmailWorkflow } from "../workflows/send-email"

/**
 * 使用工作流程發送產品建立通知的訂閱者
 * 示範如何在 subscriber 中使用自定義工作流程
 */
export default async function productCreateWorkflowHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    console.log(`🔄 使用工作流程發送產品建立通知: ${data.id}`)
    
    await sendEmailWorkflow(container).run({
      input: {
        id: data.id,
        template: "product-created",
        // email: "custom@email.com", // 可選：覆蓋預設郵箱
      },
    })

    console.log(`✅ 產品建立通知工作流程已執行`)

  } catch (error) {
    console.error("❌ 產品建立通知工作流程執行失敗:", error)
  }
}

export const config: SubscriberConfig = {
  event: "product.created",
}