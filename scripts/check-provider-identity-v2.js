#!/usr/bin/env node

const { loadEnv, ContainerRegistrationKeys, Modules } = require('@medusajs/framework/utils');
const { MedusaApp } = require('@medusajs/framework');

// 載入環境變數
loadEnv(process.env.NODE_ENV || 'development', process.cwd());

/**
 * 檢查 provider_identity 表的腳本
 */
async function checkProviderIdentity() {
  console.log('🔍 開始檢查 provider_identity 表...');
  
  try {
    // 初始化 Medusa 應用程式
    const { medusaApp } = await MedusaApp({ 
      loadDefaults: false,
    });
    
    console.log('✅ 已連接到 Medusa 應用程式');

    // 獲取 Auth 模組服務
    const authModuleService = medusaApp.resolve(Modules.AUTH);
    const customerModuleService = medusaApp.resolve(Modules.CUSTOMER);

    // 1. 獲取所有認證身份
    console.log('\n📋 獲取所有認證身份...');
    const authIdentities = await authModuleService.listAuthIdentities();
    console.log(`找到 ${authIdentities.length} 個認證身份`);

    // 2. 獲取所有 Provider Identities
    console.log('\n🔐 獲取所有 Provider Identities...');
    const providerIdentities = await authModuleService.listProviderIdentities();
    console.log(`找到 ${providerIdentities.length} 個 Provider Identity`);

    // 3. 詳細顯示 Google Provider Identities
    console.log('\n🌟 Google Provider Identities 詳情:');
    const googleIdentities = providerIdentities.filter(pi => pi.provider === 'google');
    
    if (googleIdentities.length === 0) {
      console.log('❌ 沒有找到 Google Provider Identity 記錄');
    } else {
      for (let i = 0; i < googleIdentities.length; i++) {
        const identity = googleIdentities[i];
        console.log(`\n--- Google Identity ${i + 1} ---`);
        console.log(`ID: ${identity.id}`);
        console.log(`Provider: ${identity.provider}`);
        console.log(`Provider User ID: ${identity.provider_user_id}`);
        console.log(`Customer ID: ${identity.customer_id || '無'}`);
        console.log(`Created At: ${identity.created_at}`);
        console.log(`Updated At: ${identity.updated_at}`);
        
        if (identity.user_metadata) {
          console.log('User Metadata:');
          console.log(JSON.stringify(identity.user_metadata, null, 2));
        }
        
        // 如果有關聯的客戶，獲取客戶資料
        if (identity.customer_id) {
          try {
            const customer = await customerModuleService.retrieveCustomer(identity.customer_id);
            console.log(`關聯的客戶:`);
            console.log(`  - Email: ${customer.email}`);
            console.log(`  - Name: ${customer.first_name || ''} ${customer.last_name || ''}`);
            console.log(`  - Created: ${customer.created_at}`);
          } catch (customerError) {
            console.log(`  - 無法獲取客戶資料: ${customerError.message}`);
          }
        }
      }
    }

    // 4. 獲取所有客戶並檢查是否有 Google 身份
    console.log('\n👥 檢查所有客戶的 Google 身份關聯:');
    const customers = await customerModuleService.listCustomers();
    console.log(`總共 ${customers.length} 個客戶`);
    
    for (const customer of customers) {
      const customerGoogleIds = googleIdentities.filter(gi => gi.customer_id === customer.id);
      if (customerGoogleIds.length > 0) {
        console.log(`\n客戶 ${customer.email} (${customer.id}):`);
        console.log(`  - 姓名: ${customer.first_name || ''} ${customer.last_name || ''}`);
        console.log(`  - Google身份數量: ${customerGoogleIds.length}`);
        customerGoogleIds.forEach((gi, idx) => {
          console.log(`  - Google身份 ${idx + 1}: ${gi.provider_user_id}`);
        });
      }
    }

    // 5. 顯示統計信息
    console.log('\n📊 統計信息:');
    console.log(`- 總認證身份數: ${authIdentities.length}`);
    console.log(`- 總 Provider Identity 數: ${providerIdentities.length}`);
    console.log(`- Google Provider Identity 數: ${googleIdentities.length}`);
    console.log(`- 總客戶數: ${customers.length}`);
    
    const customersWithGoogle = customers.filter(c => 
      googleIdentities.some(gi => gi.customer_id === c.id)
    ).length;
    console.log(`- 有 Google 身份的客戶數: ${customersWithGoogle}`);

    console.log('\n✅ 檢查完成');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error);
    console.error('錯誤詳情:', error.message);
    process.exit(1);
  }
}

checkProviderIdentity();