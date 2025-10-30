#!/bin/bash

echo "🔧 修復PM2環境變數載入問題..."

cd /home/raychou/medusa-backend

echo "1. 📋 檢查.env檔案內容..."
echo "   找到的環境變數："
grep -E '^[A-Z_]' .env | head -10

echo ""
echo "2. ⏹️ 停止當前PM2進程..."
pm2 stop medusa-backend
pm2 delete medusa-backend

echo ""
echo "3. 🔄 使用ecosystem file重新啟動PM2（確保環境變數載入）..."

# 創建ecosystem.config.js檔案
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'medusa-backend',
    script: 'yarn',
    args: 'start',
    cwd: '/home/raychou/medusa-backend',
    env: {
      NODE_ENV: 'production'
    },
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/home/raychou/.pm2/logs/medusa-backend-error.log',
    out_file: '/home/raychou/.pm2/logs/medusa-backend-out.log',
    log_file: '/home/raychou/.pm2/logs/medusa-backend-combined.log',
    time: true
  }]
}
EOF

echo "4. 🚀 使用ecosystem file啟動服務..."
pm2 start ecosystem.config.js

echo ""
echo "5. ⏱️ 等待服務啟動..."
sleep 10

echo ""
echo "6. 🧪 驗證服務狀態..."
pm2 list

echo ""
echo "7. 🔍 檢查環境變數是否正確載入..."
pm2 env medusa-backend | grep -E "DATABASE_URL|JWT_SECRET|BACKEND_URL" || echo "環境變數檢查失敗"

echo ""
echo "8. 🌐 測試API endpoints..."
echo "   Health: $(curl -s -o /dev/null -w '%{http_code}' https://admin.timsfantasyworld.com/health)"
echo "   Admin: $(curl -s -o /dev/null -w '%{http_code}' https://admin.timsfantasyworld.com/app)"

echo ""
echo "✅ 修復完成！現在請重新登入管理面板並測試圖片上傳功能。"