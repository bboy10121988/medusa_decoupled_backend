// 測試上傳API返回的URL格式
const fs = require('fs');
const path = require('path');

// 模擬文件上傳API的URL生成邏輯
function testUrlGeneration() {
  console.log('🧪 測試URL生成邏輯:');
  
  const BACKEND_URL = process.env.BACKEND_URL;
  console.log(`環境變數 BACKEND_URL: ${BACKEND_URL}`);
  
  const baseUrl = BACKEND_URL || 'http://localhost:9000';
  console.log(`使用的 baseUrl: ${baseUrl}`);
  
  const testFileName = 'test_image_12345.png';
  const generatedUrl = `${baseUrl}/static/uploads/${testFileName}`;
  
  console.log(`生成的圖片URL: ${generatedUrl}`);
  
  // 檢查是否使用了正確的HTTPS URL
  if (generatedUrl.startsWith('https://admin.timsfantasyworld.com')) {
    console.log('✅ URL格式正確！');
  } else {
    console.log('❌ URL格式不正確，可能影響管理界面顯示');
  }
}

testUrlGeneration();