const { MedusaApp } = require('@medusajs/medusa')

async function createPublishableKey() {
  try {
    const { container } = await MedusaApp({ 
      directory: process.cwd(),
    })
    
    const publishableKeyModuleService = container.resolve('publishableKeyModuleService')
    
    // 創建新的 publishable key
    const newKey = await publishableKeyModuleService.createPublishableKeys({
      title: 'Default Store Key'
    })
    
    console.log('✅ 創建的 publishable key:', newKey.id)
    console.log('請將此 key 複製到 .env 文件中')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ 創建 publishable key 失敗:', error)
    process.exit(1)
  }
}

createPublishableKey()
