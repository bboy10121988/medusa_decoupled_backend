#!/bin/bash
# Google OAuth Production 部署腳本
# 用於修復 callbackUrl 環境變數問題

set -e

cd ~/projects/backend

echo "🔧 部署 Google OAuth 生產環境配置..."
echo ""

# 確保 .env.production 存在
if [ ! -f .env.production ]; then
  echo "❌ 錯誤: .env.production 文件不存在"
  echo "請先創建 .env.production 文件"
  exit 1
fi

# 驗證必要的環境變數
echo "1️⃣ 驗證環境變數..."
if ! grep -q "GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com" .env.production; then
  echo "❌ 錯誤: GOOGLE_CALLBACK_URL 配置不正確"
  echo "當前配置:"
  grep "GOOGLE_CALLBACK_URL" .env.production || echo "  (未找到)"
  echo ""
  echo "應該是:"
  echo "  GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback"
  exit 1
fi

if ! grep -q "NODE_ENV=production" .env.production; then
  echo "⚠️  警告: .env.production 中沒有 NODE_ENV=production"
  echo "   將自動添加..."
  echo "NODE_ENV=production" >> .env.production
fi

echo "✅ 環境變數驗證通過"
echo ""

# 清除緩存
echo "2️⃣ 清除編譯緩存..."
rm -rf .medusa node_modules/.cache
echo "✅ 緩存已清除"
echo ""

# 重新編譯
echo "3️⃣ 重新編譯 (NODE_ENV=production)..."
NODE_ENV=production yarn build
if [ $? -ne 0 ]; then
  echo "❌ 編譯失敗"
  exit 1
fi
echo "✅ 編譯完成"
echo ""

# 驗證編譯結果
echo "4️⃣ 驗證編譯結果..."
if grep -q "admin.timsfantasyworld.com/auth/customer/google/callback" .medusa/server/medusa-config.js; then
  echo "✅ 編譯配置包含正確的 callback URL"
else
  echo "⚠️  警告: 編譯配置中未找到正確的 callback URL"
fi
echo ""

# 完全重啟 PM2
echo "5️⃣ 重啟 PM2..."
pm2 delete medusa-backend 2>/dev/null || true
pm2 kill
sleep 2
pm2 start ecosystem.config.js
echo "✅ PM2 已重啟"
echo ""

# 等待服務啟動
echo "6️⃣ 等待服務啟動..."
sleep 8

# 檢查服務狀態
if pm2 list | grep -q "online.*medusa-backend"; then
  echo "✅ 服務已啟動"
else
  echo "❌ 服務啟動失敗"
  pm2 logs medusa-backend --lines 20
  exit 1
fi
echo ""

# 測試 OAuth 配置
echo "7️⃣ 測試 OAuth 配置..."
RESPONSE=$(curl -s 'https://admin.timsfantasyworld.com/auth/customer/google' 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ 無法連接到服務"
  echo "回應: $RESPONSE"
  exit 1
fi

REDIRECT_URI=$(echo "$RESPONSE" | python3 -c "
import sys, json, urllib.parse
try:
    data = json.load(sys.stdin)
    url = data.get('location', '')
    params = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(url).query))
    print(urllib.parse.unquote(params.get('redirect_uri', 'NOT_FOUND')))
except Exception as e:
    print('ERROR: ' + str(e))
" 2>&1)

echo "🔍 redirect_uri: $REDIRECT_URI"
echo ""

if [[ "$REDIRECT_URI" == *"admin.timsfantasyworld.com/auth/customer/google/callback"* ]]; then
  echo "✅ Google OAuth 配置成功!"
elif [[ "$REDIRECT_URI" == "NOT_FOUND" ]]; then
  echo "❌ 錯誤: 無法從回應中解析 redirect_uri"
  echo "原始回應:"
  echo "$RESPONSE"
  exit 1
elif [[ "$REDIRECT_URI" == ERROR* ]]; then
  echo "❌ 錯誤: 解析回應時發生錯誤"
  echo "$REDIRECT_URI"
  exit 1
else
  echo "❌ 錯誤: redirect_uri 不正確"
  echo "預期: https://admin.timsfantasyworld.com/auth/customer/google/callback"
  echo "實際: $REDIRECT_URI"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 部署完成!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 下一步操作:"
echo ""
echo "1. 確認 Google Cloud Console 設定:"
echo "   前往: https://console.cloud.google.com/apis/credentials"
echo "   授權重新導向 URI 應包含:"
echo "   ✓ https://admin.timsfantasyworld.com/auth/customer/google/callback"
echo ""
echo "2. 更新前端 OAuth 按鈕代碼:"
echo "   const handleGoogleLogin = () => {"
echo "     window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'"
echo "   }"
echo ""
echo "3. 測試完整登入流程"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
