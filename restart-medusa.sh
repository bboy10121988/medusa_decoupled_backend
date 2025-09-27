#!/bin/bash
echo "🔄 優雅重啟 Medusa 服務..."

# 停止舊服務
echo "⏹️ 停止舊服務..."
pkill -f "medusa start"
pkill -f "medusa develop"

# 等待進程完全停止
sleep 5

# 確保 uploads 目錄存在
mkdir -p uploads
chmod 755 uploads

# 啟動新服務
echo "🚀 啟動新服務..."
nohup node node_modules/@medusajs/cli/cli.js start > medusa.log 2>&1 &

# 等待服務啟動
sleep 15

echo "✅ 服務重啟完成！"
echo "📋 檢查服務狀態:"
ps aux | grep medusa | grep -v grep
echo ""
echo "🌐 測試連接:"
curl -s http://localhost:9000/health
