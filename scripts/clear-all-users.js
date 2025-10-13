#!/usr/bin/env node

const { loadEnv, ContainerRegistrationKeys, Modules } = require('@medusajs/framework/utils');
const { MedusaApp } = require('@medusajs/framework');

// 載入環境變數
loadEnv(process.env.NODE_ENV || 'development', process.cwd());

/**
 * 清除所有用戶和認證資料的腳本
 * 注意：這將刪除所有客戶、認證身份和相關資料
 */
async function clearAllUsers() {

  console.log('🗑️  開始清除所有用戶和認證資料...');
  console.log('⚠️  警告：這將刪除所有客戶資料，請確認您想要繼續!');
  
  // 等待用戶確認
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const shouldContinue = await new Promise(resolve => {
    rl.question('輸入 "YES" 來確認刪除所有用戶資料: ', (answer) => {
      resolve(answer === 'YES');
    });
  });

  rl.close();

  if (!shouldContinue) {
    console.log('❌ 操作已取消');
    return;
  }

  // 初始化 Medusa 應用程式
  const { medusaApp } = await MedusaApp({ 
    loadDefaults: false,
  });
  
  try {
    console.log('✅ 已連接到 Medusa 應用程式');

    // 獲取 Medusa 服務
    const customerModuleService = medusaApp.resolve(Modules.CUSTOMER);
    const authModuleService = medusaApp.resolve(Modules.AUTH);
    const cartModuleService = medusaApp.resolve(Modules.CART);
    const orderModuleService = medusaApp.resolve(Modules.ORDER);

    // 1. 先獲取所有客戶
    console.log('� 獲取所有客戶資料...');
    const customers = await customerModuleService.listCustomers();
    console.log(`📊 找到 ${customers.length} 個客戶`);

    if (customers.length === 0) {
      console.log('ℹ️  沒有找到任何客戶資料');
      return;
    }

    // 2. 刪除所有購物車
    console.log('� 刪除所有購物車...');
    const carts = await cartModuleService.listCarts();
    for (const cart of carts) {
      await cartModuleService.deleteCart(cart.id);
    }
    console.log(`✅ 已刪除 ${carts.length} 個購物車`);

    // 3. 刪除所有訂單
    console.log('📦 刪除所有訂單...');
    const orders = await orderModuleService.listOrders();
    for (const order of orders) {
      await orderModuleService.deleteOrder(order.id);
    }
    console.log(`✅ 已刪除 ${orders.length} 個訂單`);

    // 4. 刪除所有認證身份
    console.log('� 刪除所有認證身份...');
    const authIdentities = await authModuleService.listAuthIdentities();
    for (const identity of authIdentities) {
      await authModuleService.deleteAuthIdentity(identity.id);
    }
    console.log(`✅ 已刪除 ${authIdentities.length} 個認證身份`);

    // 5. 最後刪除所有客戶
    console.log('👤 刪除所有客戶...');
    for (const customer of customers) {
      await customerModuleService.deleteCustomer(customer.id);
    }

    console.log('✅ 所有用戶和認證資料已成功刪除');
    console.log(`📊 統計資訊:`);
    console.log(`   - 刪除客戶數量: ${customers.length}`);
    console.log(`   - 刪除購物車數量: ${carts.length}`);
    console.log(`   - 刪除訂單數量: ${orders.length}`);
    console.log(`   - 刪除認證身份數量: ${authIdentities.length}`);
    
    // 驗證刪除結果
    const remainingCustomers = await customerModuleService.listCustomers();
    if (remainingCustomers.length === 0) {
      console.log('✅ 驗證成功：所有客戶已被刪除');
    } else {
      console.log(`⚠️  警告：仍有 ${remainingCustomers.length} 個客戶記錄存在`);
    }

  } catch (error) {
    console.error('❌ 刪除用戶資料時發生錯誤:', error);
  } finally {
    await medusaApp.dispose();
    console.log('🔌 Medusa 應用程式已關閉');
  }
}

// 如果直接執行此腳本，則運行清除函數
if (require.main === module) {
  clearAllUsers().catch(console.error);
}

module.exports = { clearAllUsers };