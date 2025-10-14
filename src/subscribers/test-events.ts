import {
  SubscriberArgs,
  type SubscriberConfig,
} from "@medusajs/framework"

/**
 * 測試訂閱者 - 監聽任何事件
 */
export default async function testEventHandler({
  event,
}: SubscriberArgs<any>) {
  console.log(`🧪 測試訂閱者收到事件:`, event.name)
  console.log(`📧 事件數據:`, JSON.stringify(event.data, null, 2))
}

export const config: SubscriberConfig = {
  event: "*", // 監聽所有事件
}