/**
 * 測試管理員訂單通知腳本
 * 模擬新訂單事件，發送測試通知給管理員
 */

const { createMedusaContainer } = require('@medusajs/framework')
const { Modules } = require('@medusajs/framework/utils')

async function testAdminNotification() {
  console.log('🧪 開始測試管理員訂單通知...')
  
  try {
    // 創建 Medusa 容器
    const container = await createMedusaContainer()
    const notificationService = container.resolve(Modules.NOTIFICATION)
    
    // 管理員郵件地址 (從環境變數讀取)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@timsfantasyworld.com'
    console.log(`📧 發送測試通知至: ${adminEmail}`)
    
    // 模擬訂單資料
    const testOrderData = {
      order_id: `test-order-${Date.now()}`,
      order_date: new Date().toLocaleDateString('zh-TW'),
      customer_name: '測試客戶',
      customer_email: 'test@example.com',
      total_amount: 1500,
      currency: 'TWD',
      items: [
        {
          title: '測試商品 A',
          quantity: 2,
          unit_price: 500,
          total: 1000
        },
        {
          title: '測試商品 B',
          quantity: 1,
          unit_price: 500,
          total: 500
        }
      ],
      items_count: 2,
      shipping_address: {
        full_name: '張三',
        company: 'ABC 公司',
        address_1: '台北市信義區信義路五段 7 號',
        address_2: '101 大樓 50 樓',
        city: '台北市',
        country_code: 'TW',
        postal_code: '110'
      },
      admin_url: `${process.env.BACKEND_URL || 'http://localhost:9000'}/admin/orders/test-order-${Date.now()}`
    }
    
    // 發送測試通知
    await notificationService.createNotifications({
      to: adminEmail,
      channel: "email",
      template: "admin-new-order",
      data: testOrderData
    })
    
    console.log('✅ 測試通知發送成功！')
    console.log('📋 測試資料:')
    console.log(`   訂單編號: ${testOrderData.order_id}`)
    console.log(`   客戶: ${testOrderData.customer_name}`)
    console.log(`   總金額: ${testOrderData.currency} ${testOrderData.total_amount}`)
    console.log(`   收件人: ${adminEmail}`)
    console.log('\n📬 請檢查您的信箱是否收到測試通知')
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message)
    console.error(error.stack)
  }
  
  process.exit(0)
}

// 執行測試
testAdminNotification()