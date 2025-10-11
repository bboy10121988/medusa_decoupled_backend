import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

// 最大重試次數
const MAX_RETRIES = 5

// 處理客戶創建後的 OAuth 資料同步
export default async function authCustomerSyncSubscriber({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  try {
    const customerId = event.data.id
    logger.info(`🔍 Processing customer creation: ${customerId}`)

    // 延遲執行，等待 provider_identity 記錄創建
    // 增加延遲時間並設置多次重試
    setTimeout(async () => {
      try {
        // 傳入重試次數參數
        await syncCustomerWithOAuth(customerId, container, 0)
      } catch (error) {
        logger.error(`❌ Error in delayed OAuth sync: ${error.message}`)
      }
    }, 3000) // 增加延遲到 3 秒

  } catch (error) {
    logger.error(`❌ Error in auth customer sync subscriber: ${error.message}`)
    logger.error(error.stack)
  }
}

// 分離的同步函數，增加重試次數參數
async function syncCustomerWithOAuth(customerId: string, container: any, retryCount: number = 0) {
  const logger = container.resolve("logger")
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  try {
    // 獲取客戶資料
    const customer = await customerModuleService.retrieveCustomer(customerId)
    
    if (!customer) {
      logger.warn(`Customer not found during OAuth sync (retry ${retryCount})`)
      if (retryCount < MAX_RETRIES) {
        // 如果客戶不存在，可能還沒同步，嘗試重試
        scheduleRetry(customerId, container, retryCount)
      }
      return
    }

    // 檢查是否是通過 OAuth 創建的客戶（臨時 email 表示是預設值）
    const isTempEmail = customer.email === "example@medusajs.com" || 
                       customer.email.startsWith("temp_") || 
                       customer.email.startsWith("google_user_") ||
                       customer.email.endsWith("@medusajs.com")
    
    if (isTempEmail) {
      logger.info(`🔍 Found customer with default email (retry ${retryCount}), checking for OAuth data...`)
      
      // 查詢是否有對應的 Google OAuth provider_identity
      // 擴展查詢以檢索更多可能包含 email 的欄位
      const query = `
        SELECT 
          pi.id,
          pi.user_metadata, 
          pi.provider_metadata,
          pi.data,
          pi.provider_user_id
        FROM provider_identity pi 
        JOIN auth_identity ai ON pi.auth_identity_id = ai.id
        WHERE ai.app_metadata->>'customer_id' = $1 AND pi.provider = 'google'
        ORDER BY pi.created_at DESC 
        LIMIT 1
      `
      
      const manager = container.resolve("manager")
      const result = await manager.query(query, [customerId])
      
      if (result && result.length > 0) {
        const googleData = result[0]
        logger.info(`Found Google OAuth data for customer: ${JSON.stringify(googleData)}`)
        
        // 嘗試從多個可能的來源獲取 email
        const userMetadata = googleData.user_metadata || {}
        const providerMetadata = googleData.provider_metadata || {}
        const data = googleData.data || {}
        
        // 嘗試從多個位置獲取 email
        let googleEmail = userMetadata.email || 
                         providerMetadata.email ||
                         (data && typeof data === 'object' ? data.email : undefined)
        
        // 如果 data 是字符串且看起來像 JSON，嘗試解析它
        if (!googleEmail && typeof data === 'string' && data.includes('{')) {
          try {
            const parsedData = JSON.parse(data)
            googleEmail = parsedData.email
          } catch (e) {
            // 解析錯誤，忽略
          }
        }
        
        // 嘗試從多個位置獲取名字
        const firstName = userMetadata.given_name || 
                         userMetadata.name || 
                         providerMetadata.given_name ||
                         providerMetadata.name ||
                         (data && typeof data === 'object' ? (data.given_name || data.name) : undefined)
                         
        const lastName = userMetadata.family_name || 
                        providerMetadata.family_name ||
                        (data && typeof data === 'object' ? data.family_name : undefined)
        
        if (googleEmail) {
          logger.info(`🔄 Updating customer with Google OAuth data: ${googleEmail}`)
          
          await customerModuleService.updateCustomers(customerId, {
            email: googleEmail,
            first_name: firstName || customer.first_name,
            last_name: lastName || customer.last_name,
          })
          
          logger.info(`✅ Successfully updated customer ${customerId} with Google email: ${googleEmail}`)
        } else {
          logger.warn(`No email found in Google OAuth metadata (retry ${retryCount})`)
          
          if (retryCount < MAX_RETRIES) {
            // 即使找到了 OAuth 數據但沒有 email，仍然嘗試重試
            scheduleRetry(customerId, container, retryCount)
          }
        }
      } else {
        logger.info(`No Google OAuth data found for this customer (retry ${retryCount}), will retry...`)
        
        if (retryCount < MAX_RETRIES) {
          // 如果還沒有找到 OAuth 資料，再次延遲重試
          scheduleRetry(customerId, container, retryCount)
        }
      }
    } else {
      logger.info(`Customer already has valid email: ${customer.email}`)
    }
  } catch (error) {
    logger.error(`❌ Error in OAuth sync (retry ${retryCount}): ${error.message}`)
    
    if (retryCount < MAX_RETRIES) {
      // 錯誤時也進行重試
      scheduleRetry(customerId, container, retryCount)
    }
  }
}

// 輔助函數：安排重試
function scheduleRetry(customerId: string, container: any, currentRetry: number) {
  const logger = container.resolve("logger")
  const nextRetry = currentRetry + 1
  // 指數退避策略：每次重試增加等待時間
  const delay = 3000 * Math.pow(1.5, currentRetry)
  
  logger.info(`Scheduling retry ${nextRetry} for customer ${customerId} in ${delay}ms`)
  
  setTimeout(async () => {
    try {
      await syncCustomerWithOAuth(customerId, container, nextRetry)
    } catch (retryError) {
      logger.error(`❌ Error in OAuth sync retry ${nextRetry}: ${retryError.message}`)
    }
  }, delay)
}