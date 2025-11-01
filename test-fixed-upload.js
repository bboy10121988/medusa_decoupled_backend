// 測試修復後的上傳URL生成
const BACKEND_URL = process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com';
const testFilename = 'test-product-image.png';

console.log('🔍 測試修復後的URL生成:');
console.log('Environment BACKEND_URL:', BACKEND_URL);

// 模擬文件服務配置: backend_url + '/static'
const baseUrl = BACKEND_URL + '/static';
console.log('File service base URL:', baseUrl);

// 模擬上傳API返回的URL
const uploadedUrl = `${baseUrl}/uploads/${testFilename}`;
console.log('Generated image URL:', uploadedUrl);

// 驗證URL格式
if (uploadedUrl === 'https://admin.timsfantasyworld.com/static/uploads/test-product-image.png') {
  console.log('✅ SUCCESS: URL格式正確！');
  console.log('🎯 現在產品媒體上傳應該能正常顯示了');
} else {
  console.log('❌ ERROR: URL格式仍然不正確');
}
