#!/bin/bash

# VM 部署腳本 - 自動更新和重啟 Medusa 後端服務
# 使用方法: ./deploy-vm.sh

set -e

echo "🚀 開始 VM 部署流程..."
echo "================================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VM 連接資訊
VM_NAME="tims-web"
VM_ZONE="asia-east1-c"
VM_PROJECT="social-login-341607"
VM_USER="raychou"
VM_PATH="/home/raychou/projects/backend"

echo -e "${BLUE}📡 連接到 VM: ${VM_NAME}${NC}"
echo -e "   專案: ${VM_PROJECT}"
echo -e "   區域: ${VM_ZONE}"
echo -e "   路徑: ${VM_PATH}"
echo ""

# 創建 VM 執行腳本
VM_SCRIPT=$(cat << 'EOF'
#!/bin/bash
set -e

echo "🔄 VM 內部部署開始..."
cd /home/raychou/projects/backend

# 1. Git Pull with conflict handling
echo "📥 1/5 更新程式碼..."

# 檢查是否有未提交的變更
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "⚠️  偵測到本地變更，暫存中..."
    git stash push -m "Auto-stash before deployment $(date)"
fi

# 更新程式碼
git fetch origin main
git reset --hard origin/main

echo "✅ Git pull 完成"

# 2. Install Dependencies
echo "📦 2/5 清理並安裝依賴套件..."
rm -rf node_modules .medusa
yarn install
echo "✅ 依賴安裝完成"

# 3. Build
echo "🔨 3/5 建置專案..."
yarn build
echo "✅ 建置步驟完成"

# 4. 檢查系統配置
echo "🔍 4/5 檢查系統配置..."
if [ -f "scripts/check-admin-system.js" ]; then
    echo "檢查 Admin 系統..."
    node scripts/check-admin-system.js
fi

if [ -f "scripts/check-resend-config.js" ]; then
    echo "檢查 Resend 配置..."
    node scripts/check-resend-config.js
fi

# 5. Restart Services
echo "🔄 5/5 重啟服務..."

# 檢查 PM2 是否有運行的進程
if pm2 list | grep -q "online\|stopped\|errored"; then
    echo "重啟現有 PM2 進程..."
    pm2 restart all
else
    echo "啟動新的 PM2 進程..."
    pm2 start ecosystem.config.js
fi

# 檢查服務狀態
echo "📊 服務狀態檢查..."
pm2 list
pm2 logs --lines 10

echo "✅ VM 部署完成！"
echo "🌐 服務地址: http://35.185.142.194:9000/app"
EOF
)

# 執行 VM 部署
echo -e "${YELLOW}執行 VM 部署命令...${NC}"

gcloud compute ssh "${VM_NAME}" \
    --zone="${VM_ZONE}" \
    --project="${VM_PROJECT}" \
    --command="$VM_SCRIPT"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 VM 部署成功完成！${NC}"
    echo ""
    echo -e "${BLUE}📋 部署摘要:${NC}"
    echo "   ✅ 程式碼已更新 (git pull)"
    echo "   ✅ 依賴已安裝 (yarn install)"
    echo "   ✅ 專案已建置 (yarn build)"
    echo "   ✅ 系統配置已檢查"
    echo "   ✅ 服務已重啟 (PM2)"
    echo ""
    echo -e "${YELLOW}🔗 服務連結:${NC}"
    echo "   管理後台: http://35.185.142.194:9000/app"
    echo "   API 端點: http://35.185.142.194:9000"
    echo ""
    echo -e "${BLUE}📝 後續操作:${NC}"
    echo "   1. 測試管理員登入: http://35.185.142.194:9000/app"
    echo "   2. 檢查 Redis 緩存是否提升登入速度"
    echo "   3. 測試忘記密碼和訂單通知功能"
else
    echo ""
    echo -e "${RED}❌ VM 部署過程中發生錯誤${NC}"
    echo "請檢查上方的錯誤訊息並手動修復"
fi