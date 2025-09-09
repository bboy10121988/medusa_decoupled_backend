#!/bin/bash

# VM Medusa 啟動腳本
echo "🚀 啟動 Medusa VM 後端服務..."

# 設定環境變數
export HOST=0.0.0.0
export PORT=9000
export NODE_ENV=development

# 確保 uploads 目錄存在
mkdir -p uploads
chmod 755 uploads

# 啟動服務
echo "📡 服務將在以下地址運行:"
echo "   - 本地訪問: http://localhost:9000"
echo "   - 外部訪問: http://35.236.182.29:9000"
echo "   - 管理介面: http://35.236.182.29:9000/app"
echo ""

# 使用 nohup 在背景執行（可選）
if [ "$1" = "background" ]; then
    echo "🔄 在背景啟動服務..."
    nohup node node_modules/@medusajs/cli/cli.js develop > medusa.log 2>&1 &
    echo "✅ 服務已在背景啟動，查看日誌: tail -f medusa.log"
else
    echo "🔄 啟動開發服務器..."
    node node_modules/@medusajs/cli/cli.js develop
fi
