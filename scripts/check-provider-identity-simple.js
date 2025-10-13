/**
 * 檢查 provider_identity 表的腳本
 * 使用: npx medusa exec scripts/check-provider-identity-simple.js
 */

import { Modules } from '@medusajs/framework/utils';

export default async function checkProviderIdentity({ container }) {
  console.log('🔍 開始檢查 provider_identity 相關資料...');

  try {
    // 獲取服務
    const authModuleService = container.resolve(Modules.AUTH);
    const customerModuleService = container.resolve(Modules.CUSTOMER);

    // 1. 獲取所有 Provider Identities
    console.log('\n🔐 獲取所有 Provider Identities...');
    const providerIdentities = await authModuleService.listProviderIdentities();
    console.log(`找到 ${providerIdentities.length} 個 Provider Identity`);

    // 2. 詳細顯示 Google Provider Identities
    console.log('\n🌟 Google Provider Identities 詳情:');
    const googleIdentities = providerIdentities.filter(pi => pi.provider === 'google');
    
    if (googleIdentities.length === 0) {
      console.log('❌ 沒有找到 Google Provider Identity 記錄');
    } else {
      console.log(`✅ 找到 ${googleIdentities.length} 個 Google Provider Identity`);
      
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
            console.log(`  - ID: ${customer.id}`);
            console.log(`  - Email: ${customer.email}`);
            console.log(`  - Name: ${customer.first_name || ''} ${customer.last_name || ''}`);
            console.log(`  - Created: ${customer.created_at}`);
            
            if (customer.metadata) {
              console.log(`  - Metadata:`, JSON.stringify(customer.metadata, null, 2));
            }
          } catch (customerError) {
            console.log(`  - 無法獲取客戶資料: ${customerError.message}`);
          }
        }
      }
    }

    // 3. 獲取所有客戶
    console.log('\n👥 所有客戶列表:');
    const customers = await customerModuleService.listCustomers();
    console.log(`總共 ${customers.length} 個客戶`);
    
    customers.forEach((customer, index) => {
      console.log(`\n客戶 ${index + 1}: ${customer.email} (${customer.id})`);
      console.log(`  - 姓名: ${customer.first_name || ''} ${customer.last_name || ''}`);
      console.log(`  - 創建時間: ${customer.created_at}`);
      
      // 檢查是否有關聯的 Google 身份
      const associatedGoogleIds = googleIdentities.filter(gi => gi.customer_id === customer.id);
      if (associatedGoogleIds.length > 0) {
        console.log(`  - Google 身份數量: ${associatedGoogleIds.length}`);
        associatedGoogleIds.forEach((gi, idx) => {
          console.log(`    Google身份 ${idx + 1}: ${gi.provider_user_id} (ID: ${gi.id})`);
        });
      } else {
        console.log(`  - 無關聯的 Google 身份`);
      }
    });

    // 4. 統計信息
    console.log('\n📊 統計信息:');
    console.log(`- 總 Provider Identity 數: ${providerIdentities.length}`);
    console.log(`- Google Provider Identity 數: ${googleIdentities.length}`);
    console.log(`- 總客戶數: ${customers.length}`);
    
    const customersWithGoogle = customers.filter(c => 
      googleIdentities.some(gi => gi.customer_id === c.id)
    ).length;
    console.log(`- 有 Google 身份的客戶數: ${customersWithGoogle}`);

    // 5. 檢查是否有孤立的資料
    const orphanedGoogle = googleIdentities.filter(gi => !gi.customer_id);
    if (orphanedGoogle.length > 0) {
      console.log(`\n⚠️  發現 ${orphanedGoogle.length} 個沒有關聯客戶的 Google 身份:`);
      orphanedGoogle.forEach((gi, idx) => {
        console.log(`  ${idx + 1}. ID: ${gi.id}, Provider User ID: ${gi.provider_user_id}`);
      });
    }

    console.log('\n✅ 檢查完成');
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error);
    console.error('錯誤詳情:', error.message);
    if (error.stack) {
      console.error('錯誤堆疊:', error.stack);
    }
  }
};