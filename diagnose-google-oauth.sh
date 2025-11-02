#!/bin/bash

# Google OAuth 診斷和修復腳本
# 用途: 檢查並修復 Google OAuth 配置問題

echo "=========================================="
echo "🔍 Google OAuth 診斷腳本"
echo "=========================================="
echo ""

# 檢查當前配置
echo "📋 當前環境變數:"
echo ""
echo "GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:0:20}..."
echo "GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:0:15}..."
echo "GOOGLE_CALLBACK_URL: $GOOGLE_CALLBACK_URL"
echo "FRONTEND_URL: $FRONTEND_URL"
echo "COOKIE_DOMAIN: $COOKIE_DOMAIN"
echo ""

# 問題診斷
echo "=========================================="
echo "⚠️  發現的問題:"
echo "=========================================="
echo ""

ISSUES_FOUND=0

# 檢查 1: GOOGLE_CALLBACK_URL 必須是後端 URL
if [[ "$GOOGLE_CALLBACK_URL" == *"timsfantasyworld.com"* ]] && [[ "$GOOGLE_CALLBACK_URL" != *"admin.timsfantasyworld.com"* ]]; then
  echo "❌ 問題 1: GOOGLE_CALLBACK_URL 設定錯誤"
  echo "   當前值: $GOOGLE_CALLBACK_URL"
  echo "   應該是: https://admin.timsfantasyworld.com/auth/customer/google/callback"
  echo "   說明: Google 必須重定向到後端,由 Medusa 處理 OAuth flow"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# 檢查 2: COOKIE_DOMAIN 不應該包含 https://
if [[ "$COOKIE_DOMAIN" == *"https://"* ]] || [[ "$COOKIE_DOMAIN" == *"http://"* ]]; then
  echo "❌ 問題 2: COOKIE_DOMAIN 包含協議"
  echo "   當前值: $COOKIE_DOMAIN"
  echo "   應該是: .timsfantasyworld.com"
  echo "   說明: Cookie domain 不應包含 http(s)://,且要以 . 開頭才能跨子網域"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# 檢查 3: 必要的環境變數
if [ -z "$GOOGLE_CLIENT_ID" ]; then
  echo "❌ 問題 3: GOOGLE_CLIENT_ID 未設定"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ 問題 4: GOOGLE_CLIENT_SECRET 未設定"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ 沒有發現配置問題"
  echo ""
else
  echo "=========================================="
  echo "🔧 建議的修復:"
  echo "=========================================="
  echo ""
  echo "請執行以下命令修復環境變數:"
  echo ""
  echo "cat >> .env << 'EOF'"
  echo "# Google OAuth 配置 (修復版)"
  echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
  echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
  echo "GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback"
  echo "FRONTEND_URL=https://timsfantasyworld.com"
  echo "COOKIE_DOMAIN=.timsfantasyworld.com"
  echo "NODE_ENV=production"
  echo "EOF"
  echo ""
  echo "然後重啟服務:"
  echo "pm2 restart medusa-backend --update-env"
  echo ""
fi

# 檢查 Google Cloud Console 配置
echo "=========================================="
echo "📝 Google Cloud Console 檢查清單:"
echo "=========================================="
echo ""
echo "請確認以下設定:"
echo ""
echo "1. Authorized redirect URIs 必須包含:"
echo "   ✓ https://admin.timsfantasyworld.com/auth/customer/google/callback"
echo ""
echo "2. OAuth consent screen:"
echo "   ✓ 已發布 (Published)"
echo "   ✓ User type: External"
echo ""
echo "3. Scopes 必須包含:"
echo "   ✓ openid"
echo "   ✓ .../auth/userinfo.email"
echo "   ✓ .../auth/userinfo.profile"
echo ""
echo "4. Test users (開發階段):"
echo "   ✓ 已加入測試 Gmail 帳號"
echo ""

# 檢查資料庫連接
echo "=========================================="
echo "🗄️  資料庫連接檢查:"
echo "=========================================="
echo ""

if [ -n "$DATABASE_URL" ]; then
  echo "✅ DATABASE_URL 已設定"
  
  # 測試資料庫連接
  if command -v psql &> /dev/null; then
    echo "正在測試資料庫連接..."
    if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
      echo "✅ 資料庫連接成功"
      
      # 檢查 customer 表
      CUSTOMER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM customer WHERE metadata->>'auth_provider' = 'google';" 2>/dev/null | tr -d ' ')
      echo "📊 Google 登入的客戶數量: $CUSTOMER_COUNT"
    else
      echo "❌ 資料庫連接失敗"
    fi
  fi
else
  echo "❌ DATABASE_URL 未設定"
fi

echo ""
echo "=========================================="
echo "🧪 測試步驟:"
echo "=========================================="
echo ""
echo "修復配置後,請按以下步驟測試:"
echo ""
echo "1. 重啟後端服務:"
echo "   pm2 restart medusa-backend --update-env"
echo ""
echo "2. 查看即時日誌:"
echo "   pm2 logs medusa-backend --lines 0"
echo ""
echo "3. 在前端點擊「使用 Google 登入」"
echo ""
echo "4. 預期看到的日誌:"
echo "   === Google OAuth Callback ==="
echo "   Profile: { email: '...', ... }"
echo "   ✅ Google Auth: Customer ... already exists/created"
echo "   🔐 JWT token generated"
echo "   🍪 Setting cookie..."
echo "   ✅ Cookie set successfully"
echo ""
echo "5. 確認前端可以成功登入並進入會員中心"
echo ""

echo "=========================================="
echo "📞 如果問題持續存在:"
echo "=========================================="
echo ""
echo "請收集以下資訊並提供:"
echo ""
echo "1. 完整的後端日誌 (pm2 logs medusa-backend --lines 100)"
echo "2. 前端 Console 日誌"
echo "3. 前端 Network 請求 (截圖)"
echo "4. Chrome DevTools → Application → Cookies"
echo ""
echo "=========================================="
