const BACKEND_URL = process.env.BACKEND_URL || 'https://admin.timsfantasyworld.com';
const baseUrl = BACKEND_URL + '/static/uploads';
const testFile = 'test-image.png';
const fullUrl = `${baseUrl}/${testFile}`;
console.log('🎯 修復後的URL:', fullUrl);
console.log('✅ 應該能正確訪問:', fullUrl === 'https://admin.timsfantasyworld.com/static/uploads/test-image.png');
