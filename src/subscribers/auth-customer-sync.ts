import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

// 監聽認證身份創建事件，為 Google OAuth 用戶自動創建 customer 記錄
export default async function authCustomerSync({ 
  event, 
  container 
}: SubscriberArgs<any>) {
  const logger = container.resolve('logger') as any
  const customerModuleService = container.resolve('customerModuleService') as any
  
  try {
    logger.info('🔐 Auth identity created event received')
    logger.info(JSON.stringify({ eventName: event.name, data: event.data }))
    
    // 檢查是否是 provider_identity 創建事件
    if (event.name === 'provider_identity.created') {
      const { provider, user_metadata, entity_id } = event.data
      
      // 只處理 Google OAuth
      if (provider === 'google' && user_metadata?.email) {
        const email = user_metadata.email
        const firstName = user_metadata.given_name || user_metadata.name?.split(' ')[0] || ''
        const lastName = user_metadata.family_name || user_metadata.name?.split(' ').slice(1).join(' ') || ''
        
        logger.info('🎯 Processing Google OAuth user')
        logger.info(JSON.stringify({ email, firstName, lastName, entity_id }))
        
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
          const existingCustomer = existingCustomers[0]
          const tempEmailPatterns = [
            'example@medusajs.com',
            '@google.user',
            '@tmp.medusa',
          ]
          const isTempEmail =
            !existingCustomer.email ||
            tempEmailPatterns.some((pattern) =>
              existingCustomer.email.includes(pattern)
            )

          if (isTempEmail || existingCustomer.email !== email) {
            logger.info('🔄 Updating existing customer with Google email', {
              customerId: existingCustomer.id,
              from: existingCustomer.email,
              to: email,
            })

            await customerModuleService.updateCustomers(existingCustomer.id, {
              email,
              first_name: existingCustomer.first_name || firstName,
              last_name: existingCustomer.last_name || lastName,
              metadata: {
                ...(existingCustomer.metadata || {}),
                auth_provider: 'google',
                google_entity_id: entity_id,
                google_email: email,
              },
            })

            logger.info('✅ Customer email synchronized with Google account', {
              customerId: existingCustomer.id,
              email,
            })
          } else if (
            existingCustomer.metadata?.google_email !== email ||
            existingCustomer.metadata?.auth_provider !== 'google'
          ) {
            logger.info('🛠 Updating Google metadata for existing customer', {
              customerId: existingCustomer.id,
            })

            await customerModuleService.updateCustomers(existingCustomer.id, {
              metadata: {
                ...(existingCustomer.metadata || {}),
                auth_provider: 'google',
                google_entity_id: entity_id,
                google_email: email,
              },
            })
          } else {
            logger.info('ℹ️ Customer already exists for email:', { email })
          }
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
