#!/bin/bash

# Google OAuth 修復腳本
# 用途: 修復 Medusa v2 Google OAuth 的配置和實作問題
# 執行: ./fix-google-oauth.sh

set -e

echo "=========================================="
echo "🔧 Google OAuth 修復腳本"
echo "=========================================="
echo ""

BACKEND_DIR="$HOME/projects/backend"
cd "$BACKEND_DIR"

echo "📍 當前目錄: $(pwd)"
echo ""

# 備份當前的 .env
if [ -f .env ]; then
  BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
  cp .env "$BACKUP_FILE"
  echo "✅ .env 已備份到: $BACKUP_FILE"
  echo ""
fi

# 讀取當前環境變數
source .env 2>/dev/null || true

# 檢查必要的環境變數
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ 錯誤: GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET 未設定"
  echo ""
  echo "請先在 .env 中設定:"
  echo "GOOGLE_CLIENT_ID=your-client-id"
  echo "GOOGLE_CLIENT_SECRET=your-client-secret"
  exit 1
fi

echo "=========================================="
echo "📝 修復環境變數"
echo "=========================================="
echo ""

# 建立臨時檔案
TEMP_ENV=$(mktemp)

# 複製現有的 .env (排除要更新的變數)
if [ -f .env ]; then
  grep -v -E "^(GOOGLE_CALLBACK_URL|FRONTEND_URL|COOKIE_DOMAIN|NODE_ENV)=" .env > "$TEMP_ENV" || true
fi

# 加入正確的配置
cat >> "$TEMP_ENV" << EOF

# Google OAuth 配置 (由 fix-google-oauth.sh 更新)
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
FRONTEND_URL=https://timsfantasyworld.com
COOKIE_DOMAIN=.timsfantasyworld.com
NODE_ENV=production
EOF

# 替換 .env
mv "$TEMP_ENV" .env

echo "✅ 環境變數已更新:"
echo ""
echo "GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback"
echo "FRONTEND_URL=https://timsfantasyworld.com"
echo "COOKIE_DOMAIN=.timsfantasyworld.com"
echo ""

echo "=========================================="
echo "🔄 重建專案"
echo "=========================================="
echo ""

echo "正在執行 yarn build..."
if yarn build; then
  echo "✅ Build 成功"
else
  echo "❌ Build 失敗,請檢查錯誤訊息"
  exit 1
fi

echo ""
echo "=========================================="
echo "🚀 重啟服務"
echo "=========================================="
echo ""

echo "正在重啟 medusa-backend..."
pm2 restart medusa-backend --update-env

echo ""
echo "等待服務啟動..."
sleep 5

echo ""
echo "=========================================="
echo "✅ 修復完成!"
echo "=========================================="
echo ""

echo "📋 接下來請:"
echo ""
echo "1. 查看服務狀態:"
echo "   pm2 status"
echo ""
echo "2. 查看即時日誌:"
echo "   pm2 logs medusa-backend --lines 0"
echo ""
echo "3. 在 Google Cloud Console 更新 Authorized redirect URIs:"
echo "   https://console.cloud.google.com/apis/credentials"
echo "   加入: https://admin.timsfantasyworld.com/auth/customer/google/callback"
echo ""
echo "4. 測試 Google 登入流程"
echo ""

echo "=========================================="
echo "🧪 測試 Endpoint"
echo "=========================================="
echo ""

echo "測試健康狀態:"
curl -s https://admin.timsfantasyworld.com/health | jq '.' || echo "健康檢查失敗"

echo ""
echo "=========================================="
echo "📝 預期的 OAuth Flow"
echo "=========================================="
echo ""
cat << 'EOF'
正確的 OAuth 流程:

1. 用戶點擊「使用 Google 登入」
   → 前端重定向到: GET https://admin.timsfantasyworld.com/auth/customer/google

2. 後端返回 Google OAuth URL
   → 用戶被重定向到 Google 授權頁面

3. 用戶授權後,Google 重定向到:
   → GET https://admin.timsfantasyworld.com/auth/customer/google/callback?code=xxx&state=xxx

4. 後端處理 callback:
   → 用 code 交換 access token
   → 取得 Google 用戶資料
   → 建立/查找 customer
   → 產生 JWT token
   → 設定 _medusa_jwt cookie (httpOnly, secure, domain=.timsfantasyworld.com)
   → 重定向回前端: https://timsfantasyworld.com/tw/auth/google/callback?success=true

5. 前端接收重定向:
   → Cookie 已自動設定 (httpOnly,前端無法讀取)
   → 顯示成功訊息
   → 重定向到會員中心: /tw/account

6. 前端請求會員資料:
   → GET https://admin.timsfantasyworld.com/store/customers/me
   → 自動攜帶 _medusa_jwt cookie
   → 成功取得客戶資料

關鍵點:
- Google 必須重定向到「後端」,不是前端
- Cookie 由「後端」設定,不是前端
- Cookie domain 必須是 .timsfantasyworld.com (注意開頭的點)
- 所有前端請求都要帶 credentials: 'include'
EOF

echo ""
echo "=========================================="
echo "完成!"
echo "=========================================="
