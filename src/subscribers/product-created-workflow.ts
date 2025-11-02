import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { sendEmailWorkflow } from "../workflows/send-email"

/**
 * 使用工作流程發送產品建立通知的訂閱者
 * 示範如何在 subscriber 中使用自定義工作流程
 * 
 * ⚠️ 非同步執行，不阻塞商品創建流程
 */
export default async function productCreateWorkflowHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // 🚀 使用 setImmediate 讓 workflow 在下一個事件循環執行，不阻塞商品創建
  setImmediate(async () => {
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
  })
  
  // 立即返回，不等待 workflow 完成
}

export const config: SubscriberConfig = {
  event: "product.created",
}