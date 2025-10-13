import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * 清除所有用戶和認證資料的腳本
 * 注意：這將刪除所有客戶、認證身份和相關資料
 */
export default async function clearAllUsers({ container }: ExecArgs) {
  console.log('🗑️  開始清除所有用戶和認證資料...')
  console.log('⚠️  注意：這將刪除所有客戶資料!')

  try {
    console.log('✅ 已連接到 Medusa 容器')

    // 獲取 Medusa 服務
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const authModuleService = container.resolve(Modules.AUTH)
    const cartModuleService = container.resolve(Modules.CART)
    const orderModuleService = container.resolve(Modules.ORDER)

    // 1. 先獲取所有客戶
    console.log('👤 獲取所有客戶資料...')
    const customers = await customerModuleService.listCustomers()
    console.log(`📊 找到 ${customers.length} 個客戶`)

    if (customers.length === 0) {
      console.log('ℹ️  沒有找到任何客戶資料')
      return
    }

    // 2. 刪除所有購物車
    console.log('🛒 刪除所有購物車...')
    const carts = await cartModuleService.listCarts()
    const cartIds = carts.map(cart => cart.id)
    if (cartIds.length > 0) {
      await cartModuleService.deleteCarts(cartIds)
    }
    console.log(`✅ 已刪除 ${carts.length} 個購物車`)

    // 3. 刪除所有訂單
    console.log('📦 刪除所有訂單...')
    const orders = await orderModuleService.listOrders()
    const orderIds = orders.map(order => order.id)
    if (orderIds.length > 0) {
      await orderModuleService.deleteOrders(orderIds)
    }
    console.log(`✅ 已刪除 ${orders.length} 個訂單`)

    // 4. 刪除所有認證身份
    console.log('🔐 刪除所有認證身份...')
    const authIdentities = await authModuleService.listAuthIdentities()
    const identityIds = authIdentities.map(identity => identity.id)
    if (identityIds.length > 0) {
      await authModuleService.deleteAuthIdentities(identityIds)
    }
    console.log(`✅ 已刪除 ${authIdentities.length} 個認證身份`)

    // 5. 最後刪除所有客戶
    console.log('👤 刪除所有客戶...')
    const customerIds = customers.map(customer => customer.id)
    if (customerIds.length > 0) {
      await customerModuleService.deleteCustomers(customerIds)
    }

    console.log('✅ 所有用戶和認證資料已成功刪除')
    console.log(`📊 統計資訊:`)
    console.log(`   - 刪除客戶數量: ${customers.length}`)
    console.log(`   - 刪除購物車數量: ${carts.length}`)
    console.log(`   - 刪除訂單數量: ${orders.length}`)
    console.log(`   - 刪除認證身份數量: ${authIdentities.length}`)
    
    // 驗證刪除結果
    const remainingCustomers = await customerModuleService.listCustomers()
    if (remainingCustomers.length === 0) {
      console.log('✅ 驗證成功：所有客戶已被刪除')
    } else {
      console.log(`⚠️  警告：仍有 ${remainingCustomers.length} 個客戶記錄存在`)
    }

  } catch (error) {
    console.error('❌ 刪除用戶資料時發生錯誤:', error)
  }
}