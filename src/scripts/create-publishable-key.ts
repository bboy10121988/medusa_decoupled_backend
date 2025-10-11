import { ExecArgs } from '@medusajs/framework/types'

const createPublishableKey = async function ({ container }: ExecArgs) {
  // 添加明確的類型宣告
  const publishableKeyModuleService = container.resolve('publishableKeyModuleService') as {
    listPublishableKeys: () => Promise<any[]>,
    createPublishableKeys: (data: { title: string }) => Promise<any>
  }
  
  try {
    // 先嘗試列出現有的 keys
    const existingKeys = await publishableKeyModuleService.listPublishableKeys()
    console.log('現有的 publishable keys:', existingKeys.length)
    
    if (existingKeys.length > 0) {
      console.log('✅ 使用現有的 publishable key:', existingKeys[0].id)
      return existingKeys[0].id
    }
    
    // 如果沒有現有的 key，創建新的
    const newKey = await publishableKeyModuleService.createPublishableKeys({
      title: 'Default Store Key'
    })
    
    console.log('✅ 創建的新 publishable key:', newKey.id)
    return newKey.id
  } catch (error) {
    console.error('❌ 處理 publishable key 失敗:', error)
    throw error
  }
}

export default createPublishableKey
