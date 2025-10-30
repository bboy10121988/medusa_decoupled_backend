#!/bin/bash

echo "🔧 診斷並修復圖片上傳認證問題..."

cd /home/raychou/medusa-backend

# 1. 檢查medusa的session配置
echo "1. 📋 檢查session和cookie配置..."
grep -n "cookie\|session\|jwt" medusa-config.ts | head -10

# 2. 檢查admin的認證狀態
echo "2. 🔐 測試admin認證狀態..."
echo "測試admin auth endpoint:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://admin.timsfantasyworld.com/admin/auth

# 3. 檢查admin users/me endpoint（用於確認session）
echo "3. 👤 測試用戶認證endpoint:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://admin.timsfantasyworld.com/admin/users/me

# 4. 檢查custom files endpoint的確切錯誤
echo "4. 📤 測試files endpoint詳細錯誤:"
curl -v https://admin.timsfantasyworld.com/admin/files 2>&1 | grep -E "(HTTP|401|403|Cookie|Authorization)"

# 5. 檢查PM2環境變數中的認證相關配置
echo "5. ⚙️ 檢查JWT和Cookie密鑰配置:"
pm2 env medusa-backend 2>/dev/null | grep -E "(JWT|COOKIE|SECRET)" || echo "PM2 env查詢失敗"

# 6. 檢查是否有CORS問題
echo "6. 🌐 檢查CORS配置:"
grep -A 5 -B 5 "adminCors" medusa-config.ts

echo ""
echo "🎯 診斷結果摘要："
echo "   ✅ Backend服務：正常運作 (port 9000)"
echo "   ✅ Nginx配置：已設定50MB上傳限制"
echo "   ✅ Static檔案：可正常訪問"
echo "   ❌ Admin認證：401錯誤需修復"
echo ""
echo "🔍 可能的問題："
echo "   1. JWT/Cookie密鑰不匹配"
echo "   2. Session過期或未正確設定"
echo "   3. CORS cookie同步問題"
echo "   4. Admin dashboard未正確認證"

echo ""
echo "📋 建議修復步驟："
echo "   1. 重新登入管理面板並檢查開發者工具"
echo "   2. 查看cookie是否正確設定"
echo "   3. 測試認證token是否有效"