import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

/**
 * 產品更新時清除前端快取的訂閱者
 * 監聽產品更新事件，呼叫前端的 revalidation API
 */
export default async function productUpdatedRevalidationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // 使用 setImmediate 避免阻塞產品更新流程
  setImmediate(async () => {
    try {
      console.log('Product updated, triggering frontend cache revalidation:', data.id)
      
      const frontendUrl = process.env.FRONTEND_URL || 'https://timsfantasyworld.com'
      const revalidationToken = process.env.REVALIDATION_TOKEN || 'medusa-revalidation-secret-2024'
      
      const revalidationUrl = frontendUrl + '/api/revalidate?token=' + revalidationToken
      
      // 呼叫前端 revalidation API
      const response = await fetch(revalidationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'product-status-changed',
          productId: data.id,
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Frontend cache cleared successfully:', result.timestamp)
      } else {
        console.error('Failed to clear frontend cache:', response.status, response.statusText)
      }
      
    } catch (error) {
      console.error('Error clearing frontend cache for product update:', error)
    }
  })
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
