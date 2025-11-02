/**
 * 測試 Google OAuth Callback 端點
 * 
 * 注意: 這個測試需要一個真實的 Google authorization code
 * 由於 code 只能使用一次且會過期,需要手動從前端獲取
 */

const https = require('https');

// 測試配置
const API_URL = 'https://admin.timsfantasyworld.com';
const TEST_ENDPOINT = '/store/auth/google/callback';
const PUBLISHABLE_KEY = 'pk_df177fe4f1c94ded6d9f25681a9519cb20f462f9d240d4de1708304f9cc05dd7';

/**
 * 測試 1: 缺少 code 參數
 */
async function testMissingCode() {
  console.log('\n🧪 測試 1: 缺少 code 參數...');
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({});
    
    const options = {
      hostname: 'admin.timsfantasyworld.com',
      port: 443,
      path: TEST_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-publishable-api-key': PUBLISHABLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`狀態碼: ${res.statusCode}`);
        const response = JSON.parse(data);
        console.log('返回內容:', response);
        
        if (res.statusCode === 400 && response.message === 'Missing authorization code') {
          console.log('✅ 測試通過: 正確返回 400 錯誤');
        } else {
          console.log('❌ 測試失敗: 預期 400 狀態碼和錯誤訊息');
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('❌ 請求錯誤:', e.message);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 測試 2: 無效的 code
 */
async function testInvalidCode() {
  console.log('\n🧪 測試 2: 無效的 authorization code...');
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      code: 'invalid_test_code_12345'
    });
    
    const options = {
      hostname: 'admin.timsfantasyworld.com',
      port: 443,
      path: TEST_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-publishable-api-key': PUBLISHABLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`狀態碼: ${res.statusCode}`);
        const response = JSON.parse(data);
        console.log('返回內容:', response);
        
        if (res.statusCode === 500 && response.success === false) {
          console.log('✅ 測試通過: 正確處理無效 code 並返回錯誤');
        } else {
          console.log('❌ 測試失敗: 預期返回錯誤響應');
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('❌ 請求錯誤:', e.message);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 測試 3: 檢查端點是否存在
 */
async function testEndpointExists() {
  console.log('\n🧪 測試 3: 檢查端點是否正確註冊...');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'admin.timsfantasyworld.com',
      port: 443,
      path: TEST_ENDPOINT,
      method: 'OPTIONS',
    };

    const req = https.request(options, (res) => {
      console.log(`狀態碼: ${res.statusCode}`);
      
      if (res.statusCode === 200 || res.statusCode === 204) {
        console.log('✅ 測試通過: 端點存在並可訪問');
      } else {
        console.log('⚠️  端點可能存在但返回狀態碼:', res.statusCode);
      }
      resolve();
    });

    req.on('error', (e) => {
      console.error('❌ 請求錯誤:', e.message);
      reject(e);
    });

    req.end();
  });
}

// 執行測試
async function runTests() {
  console.log('🚀 開始測試 Google OAuth Callback 端點');
  console.log('API URL:', API_URL + TEST_ENDPOINT);
  console.log('=' .repeat(60));

  try {
    await testEndpointExists();
    await testMissingCode();
    await testInvalidCode();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 基礎測試完成!');
    console.log('\n📝 下一步:');
    console.log('1. 前端需要實現 Google OAuth 登入流程');
    console.log('2. 從 Google 獲取真實的 authorization code');
    console.log('3. 用真實 code 測試完整流程');
    console.log('4. 驗證返回的 token 可以用於後續 API 請求');
  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:', error.message);
  }
}

// 執行測試
runTests();
