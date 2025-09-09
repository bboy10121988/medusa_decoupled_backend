#!/bin/bash

# VM 網路檢查腳本
echo "🔍 檢查 VM 網路設定..."

# 檢查端口是否開放
echo "1. 檢查端口 9000 是否被使用:"
if lsof -i :9000; then
    echo "   ✅ 端口 9000 正在使用中"
else
    echo "   ❌ 端口 9000 未在使用"
fi

echo ""
echo "2. 檢查網路介面:"
ifconfig | grep -A 1 "inet "

echo ""
echo "3. 測試本地連接:"
if curl -s http://localhost:9000/health > /dev/null; then
    echo "   ✅ 本地連接正常"
else
    echo "   ❌ 本地連接失敗"
fi

echo ""
echo "4. VM 訪問地址:"
echo "   🌐 外部訪問: http://35.236.182.29:9000"
echo "   🛠️  管理介面: http://35.236.182.29:9000/app"
echo "   📁 檔案上傳測試: http://35.236.182.29:9000/upload-test"

echo ""
echo "5. 重要提醒:"
echo "   - 確保 VM 的防火牆允許端口 9000"
echo "   - 確保雲端提供商的安全群組開放端口 9000"
echo "   - 如果使用 GCP，檢查 VPC 防火牆規則"
