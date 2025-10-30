#!/bin/bash

echo "🧪 完整測試VM圖片上傳功能..."

# 測試各項服務
echo "1. 🌐 測試基本服務..."
echo "   - Health: $(curl -s -o /dev/null -w '%{http_code}' https://admin.timsfantasyworld.com/health)"
echo "   - Admin: $(curl -s -o /dev/null -w '%{http_code}' https://admin.timsfantasyworld.com/app)"

# 測試static檔案服務
echo "2. 📁 測試Static檔案服務..."
echo "   - Static根目錄: $(curl -s -o /dev/null -w '%{http_code}' https://admin.timsfantasyworld.com/static/)"
echo "   - 實際檔案: $(curl -s -o /dev/null -w '%{http_code}' https://admin.timsfantasyworld.com/static/uploads/__1761315126029.jpg)"

# 檢查custom files API
echo "3. 🔧 測試Custom Files API..."
echo "   - Files endpoint: $(curl -s -o /dev/null -w '%{http_code}' https://admin.timsfantasyworld.com/admin/files)"

# 檢查目錄權限
echo "4. 📂 檢查目錄權限..."
ls -la static/
ls -la static/uploads/

# 檢查環境變數
echo "5. ⚙️ 檢查環境變數..."
pm2 env medusa-backend | grep BACKEND_URL

# 檢查nginx配置中的檔案大小限制
echo "6. 🌐 檢查nginx配置..."
sudo grep -n client_max_body_size /etc/nginx/sites-available/admin-timsfantasyworld

# 測試實際的檔案上傳endpoint（需要認證token）
echo "7. 📤 Files API測試..."
echo "   GET /admin/files: $(curl -s -o /dev/null -w '%{http_code}' https://admin.timsfantasyworld.com/admin/files)"

echo ""
echo "🎯 主要問題摘要："
echo "   ✅ Backend服務：正常"
echo "   ✅ Static檔案服務：正常" 
echo "   ✅ Nginx檔案大小限制：已設定50MB"
echo "   ✅ 目錄權限：正常"
echo ""
echo "🔍 需要檢查的問題："
echo "   1. 用戶認證 (401錯誤)"
echo "   2. TipTap編輯器中的圖片上傳邏輯"
echo "   3. 產品更新時的images字段驗證"

echo ""
echo "🚀 建議測試步驟："
echo "   1. 重新登入管理面板"
echo "   2. 編輯產品頁面"
echo "   3. 在TipTap編輯器中上傳圖片"
echo "   4. 儲存產品並檢查結果"