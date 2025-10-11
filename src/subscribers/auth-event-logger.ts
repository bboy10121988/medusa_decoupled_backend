import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

// 測試訂閱者：監聽所有認證相關事件
export default async function authEventLogger({ 
  event, 
  container 
}: SubscriberArgs<any>) {
  const logger = container.resolve('logger') as any
  
  // 記錄所有接收到的事件
  logger.info('🔍 EVENT RECEIVED:', {
    eventName: event.name,
    data: event.data,
    timestamp: new Date().toISOString()
  })
  
  // 如果是認證相關事件，提供更詳細的日誌
  if (event.name.includes('auth') || event.name.includes('identity') || event.name.includes('google')) {
    logger.info('🎯 AUTH EVENT DETAILS:', JSON.stringify(event, null, 2))
  }
}

export const config: SubscriberConfig = {
  event: [
    // 嘗試所有可能的事件名稱
    'provider_identity.created',
    'auth_identity.created',
    'auth.identity.created',
    'auth.provider_identity.created',
    'medusa.auth.identity.created',
    'medusa.auth.provider_identity.created',
    'customer.created',
    'user.created',
    // 監聽所有事件（萬用字符）
    '*'
  ]
}