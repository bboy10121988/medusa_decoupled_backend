import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

// 簡單直接的 Google OAuth 用戶自動創建 customer 並關聯 auth_identity
export default async function authCustomerSync({ 
  event, 
  container 
}: SubscriberArgs<any>) {
  const logger = container.resolve('logger')
  const customerModuleService = container.resolve('customerModuleService')
  
  try {
    logger.info('🔐 Event received:', event.name)
    logger.info('📊 Event data:', JSON.stringify(event.data, null, 2))
    
    if (event.name === 'provider_identity.created') {
      const providerIdentityId = event.data.id
      
      if (!providerIdentityId) {
        logger.warn('⚠️ No provider_identity ID in event')
        return
      }
      
      logger.info('🔍 Provider identity ID:', providerIdentityId)
      
      // 使用動態 import 來載入 pg 模組
      const pg = await import('pg')
      const { Pool } = pg.default || pg
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      })
      
      try {
        // 查詢 provider_identity 完整資料
        const result = await pool.query(`
          SELECT 
            pi.id,
            pi.entity_id,
            pi.provider,
            pi.user_metadata,
            pi.auth_identity_id
          FROM provider_identity pi
          WHERE pi.id = $1
        `, [providerIdentityId])
        
        if (result.rows.length === 0) {
          logger.warn('⚠️ Provider identity not found:', providerIdentityId)
          return
        }
        
        const pi = result.rows[0]
        
        logger.info('📦 Provider data:', {
          provider: pi.provider,
          entity_id: pi.entity_id,
          auth_identity_id: pi.auth_identity_id,
          has_metadata: !!pi.user_metadata,
          email: pi.user_metadata?.email
        })
        
        // 只處理 Google OAuth
        if (pi.provider === 'google' && pi.user_metadata?.email) {
          const email = pi.user_metadata.email
          const firstName = pi.user_metadata.given_name || pi.user_metadata.name || ''
          const lastName = pi.user_metadata.family_name || ''
          
          logger.info('🎯 Creating customer:', { email, firstName, lastName })
          
          // 檢查是否已存在
          const existingCustomers = await customerModuleService.listCustomers({ email })
          
          let customerId
          
          if (existingCustomers.length === 0) {
            const customer = await customerModuleService.createCustomers({
              email,
              first_name: firstName,
              last_name: lastName,
              has_account: true,
              metadata: {
                google_entity_id: pi.entity_id,
                google_name: pi.user_metadata.name,
                google_picture: pi.user_metadata.picture,
                auth_provider: 'google',
                created_via_oauth: true
              }
            })
            
            customerId = customer.id
            logger.info('✅ Customer created:', { id: customerId, email })
          } else {
            customerId = existingCustomers[0].id
            logger.info('ℹ️ Customer already exists:', { id: customerId, email })
          }
          
          // 關鍵：更新 auth_identity 的 app_metadata 來關聯 customer
          await pool.query(`
            UPDATE auth_identity
            SET app_metadata = jsonb_build_object(
              'actor_id', $1,
              'actor_type', 'customer'
            )
            WHERE id = $2
          `, [customerId, pi.auth_identity_id])
          
          logger.info('✅ Auth identity linked to customer:', {
            auth_identity_id: pi.auth_identity_id,
            customer_id: customerId
          })
        } else {
          logger.info('ℹ️ Skipping - not Google or no email')
        }
      } finally {
        await pool.end()
      }
    }
  } catch (error) {
    logger.error('❌ Error in auth customer sync:', error)
  }
}

export const config: SubscriberConfig = {
  event: ['provider_identity.created']
}
