#!/bin/bash

# Google OAuth 測試腳本
# 用途: 測試 Google OAuth 各個端點是否正常運作

echo "=========================================="
echo "🧪 Google OAuth 測試腳本"
echo "=========================================="
echo ""

BACKEND_URL="https://admin.timsfantasyworld.com"
FRONTEND_URL="https://timsfantasyworld.com"

echo "📍 測試目標:"
echo "  後端: $BACKEND_URL"
echo "  前端: $FRONTEND_URL"
echo ""

# 測試 1: 健康檢查
echo "=========================================="
echo "測試 1: 後端健康檢查"
echo "=========================================="
echo ""

if curl -s -f "${BACKEND_URL}/health" > /dev/null; then
  echo "✅ 後端健康檢查通過"
else
  echo "❌ 後端健康檢查失敗"
  exit 1
fi

# 測試 2: Google OAuth 初始化端點
echo ""
echo "=========================================="
echo "測試 2: Google OAuth 初始化端點"
echo "=========================================="
echo ""

echo "請求: GET ${BACKEND_URL}/auth/customer/google"
echo ""

RESPONSE=$(curl -s -L -I "${BACKEND_URL}/auth/customer/google" 2>&1)

if echo "$RESPONSE" | grep -q "Location.*google.*oauth"; then
  echo "✅ OAuth 初始化端點正常 (會重定向到 Google)"
  GOOGLE_URL=$(echo "$RESPONSE" | grep -i "Location:" | head -1 | cut -d' ' -f2 | tr -d '\r')
  echo "   重定向到: $GOOGLE_URL"
else
  echo "❌ OAuth 初始化端點異常"
  echo "Response:"
  echo "$RESPONSE"
fi

# 測試 3: 檢查 callback 端點是否存在
echo ""
echo "=========================================="
echo "測試 3: Callback 端點檢查"
echo "=========================================="
echo ""

echo "檢查檔案是否存在:"
CALLBACK_FILE="src/api/auth/customer/google/callback/route.ts"

if [ -f "$CALLBACK_FILE" ]; then
  echo "✅ Callback route 檔案存在: $CALLBACK_FILE"
  echo ""
  echo "檔案內容預覽:"
  head -20 "$CALLBACK_FILE"
else
  echo "❌ Callback route 檔案不存在"
  echo "   預期位置: $CALLBACK_FILE"
fi

# 測試 4: 檢查環境變數
echo ""
echo "=========================================="
echo "測試 4: 環境變數檢查"
echo "=========================================="
echo ""

if [ -f .env ]; then
  echo "檢查 .env 中的 Google OAuth 設定:"
  echo ""
  
  CALLBACK_URL=$(grep "^GOOGLE_CALLBACK_URL=" .env | cut -d'=' -f2)
  FRONTEND=$(grep "^FRONTEND_URL=" .env | cut -d'=' -f2)
  COOKIE_DOM=$(grep "^COOKIE_DOMAIN=" .env | cut -d'=' -f2)
  
  echo "GOOGLE_CALLBACK_URL: $CALLBACK_URL"
  echo "FRONTEND_URL: $FRONTEND"
  echo "COOKIE_DOMAIN: $COOKIE_DOM"
  echo ""
  
  # 驗證配置
  ERRORS=0
  
  if [[ "$CALLBACK_URL" != *"admin.timsfantasyworld.com"* ]]; then
    echo "❌ GOOGLE_CALLBACK_URL 應該指向後端 (admin.timsfantasyworld.com)"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ GOOGLE_CALLBACK_URL 正確"
  fi
  
  if [[ "$COOKIE_DOM" != ".timsfantasyworld.com" ]]; then
    echo "❌ COOKIE_DOMAIN 應該是 .timsfantasyworld.com"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ COOKIE_DOMAIN 正確"
  fi
  
  if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "⚠️  發現 $ERRORS 個配置問題,請執行 ./fix-google-oauth.sh 修復"
  fi
else
  echo "❌ .env 檔案不存在"
fi

# 測試 5: 檢查 medusa-config.ts 中的 OAuth 配置
echo ""
echo "=========================================="
echo "測試 5: Medusa 配置檢查"
echo "=========================================="
echo ""

if [ -f medusa-config.ts ]; then
  echo "檢查 medusa-config.ts 中的 Google OAuth 配置:"
  echo ""
  
  if grep -q "@medusajs/auth-google" medusa-config.ts; then
    echo "✅ Google OAuth provider 已註冊"
    
    # 顯示 Google 配置段落
    echo ""
    echo "配置內容:"
    sed -n '/auth-google/,/verify:/p' medusa-config.ts | head -20
  else
    echo "❌ Google OAuth provider 未註冊"
    echo "   請確認 medusa-config.ts 中有 @medusajs/auth-google 配置"
  fi
else
  echo "❌ medusa-config.ts 不存在"
fi

# 測試 6: 檢查資料庫
echo ""
echo "=========================================="
echo "測試 6: 資料庫檢查"
echo "=========================================="
echo ""

if [ -n "$DATABASE_URL" ]; then
  echo "正在檢查 customer 表..."
  
  if command -v psql &> /dev/null; then
    GOOGLE_CUSTOMERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM customer WHERE metadata->>'auth_provider' = 'google';" 2>/dev/null | tr -d ' ')
    TOTAL_CUSTOMERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM customer;" 2>/dev/null | tr -d ' ')
    
    echo "✅ 資料庫連接成功"
    echo "   總客戶數: $TOTAL_CUSTOMERS"
    echo "   Google 登入客戶: $GOOGLE_CUSTOMERS"
    
    if [ "$GOOGLE_CUSTOMERS" -gt 0 ]; then
      echo ""
      echo "最近的 Google 登入客戶:"
      psql "$DATABASE_URL" -c "SELECT id, email, first_name, created_at FROM customer WHERE metadata->>'auth_provider' = 'google' ORDER BY created_at DESC LIMIT 3;" 2>/dev/null
    fi
  else
    echo "⚠️  psql 未安裝,跳過資料庫檢查"
  fi
else
  echo "❌ DATABASE_URL 未設定"
fi

# 測試 7: PM2 狀態
echo ""
echo "=========================================="
echo "測試 7: PM2 服務狀態"
echo "=========================================="
echo ""

if command -v pm2 &> /dev/null; then
  pm2 describe medusa-backend 2>&1 | grep -E "status|uptime|restarts"
else
  echo "⚠️  PM2 未安裝或不在本機"
fi

# 總結
echo ""
echo "=========================================="
echo "📋 測試總結"
echo "=========================================="
echo ""

cat << 'EOF'
如果所有測試通過,請在瀏覽器中測試完整流程:

1. 訪問前端登入頁面:
   https://timsfantasyworld.com/tw/account

2. 點擊「使用 Google 登入」按鈕

3. 預期流程:
   a) 重定向到 Google 授權頁面
   b) 授權後重定向到後端 callback
   c) 後端處理並重定向回前端
   d) 前端顯示成功並進入會員中心

4. 同時在另一個終端監控日誌:
   pm2 logs medusa-backend --lines 0

5. 預期看到的日誌:
   === Google OAuth Callback ===
   Profile: { email: '...', ... }
   ✅ Google Auth: Customer ... already exists/created
   🔐 JWT token generated
   🍪 Setting cookie...
   ✅ Cookie set successfully

如果測試失敗,請查看:
- pm2 logs medusa-backend (後端日誌)
- Chrome DevTools Console (前端日誌)
- Chrome DevTools Network (網路請求)
- Chrome DevTools Application → Cookies
EOF

echo ""
echo "=========================================="
