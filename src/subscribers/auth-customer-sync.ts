import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

// 監聽認證身份創建事件，為 Google OAuth 用戶自動創建 customer 記錄
export default async function authCustomerSync({ 
  event, 
  container 
}: SubscriberArgs<any>) {
  const logger = container.resolve('logger')
  const customerModuleService = container.resolve('customerModuleService')
  
  try {
    logger.info('🔐 Auth identity created event received:', { eventName: event.name, data: event.data })
    
    // 檢查是否是 provider_identity 創建事件
    if (event.name === 'provider_identity.created') {
      const { provider, user_metadata, entity_id } = event.data
      
      // 只處理 Google OAuth
      if (provider === 'google' && user_metadata?.email) {
        const email = user_metadata.email
        const firstName = user_metadata.given_name || user_metadata.name?.split(' ')[0] || ''
        const lastName = user_metadata.family_name || user_metadata.name?.split(' ').slice(1).join(' ') || ''
        
        logger.info('🎯 Processing Google OAuth user:', { email, firstName, lastName, entity_id })
        
        // 檢查是否已經存在 customer 記錄
        const existingCustomers = await customerModuleService.listCustomers({ email })
        
        if (existingCustomers.length === 0) {
          // 創建新的 customer 記錄
          const customer = await customerModuleService.createCustomers({
            email,
            first_name: firstName,
            last_name: lastName,
            has_account: true,
            metadata: {
              google_entity_id: entity_id,
              auth_provider: 'google',
              created_via_oauth: true
            }
          })
          
          logger.info('✅ Created customer for Google OAuth user:', { 
            customerId: customer.id, 
            email, 
            entity_id 
          })
        } else {
          logger.info('ℹ️ Customer already exists for email:', { email })
        }
      }
    }
  } catch (error) {
    logger.error('❌ Error in auth customer sync:', { error: error.message, stack: error.stack })
  }
}

export const config: SubscriberConfig = {
  event: [
    'provider_identity.created',
    'auth_identity.created'
  ]
}
