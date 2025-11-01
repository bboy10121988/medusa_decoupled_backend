#!/bin/bash

# 管理員設置腳本
# 檢查和設置 Medusa Admin 登入系統

set -e

echo "🔧 Medusa Admin 設置檢查腳本"
echo "=================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查環境變數
check_env_vars() {
    echo -e "\n${BLUE}📋 檢查環境變數...${NC}"
    
    required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET" "COOKIE_SECRET")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
            echo -e "❌ ${RED}$var 未設定${NC}"
        else
            echo -e "✅ ${GREEN}$var 已設定${NC}"
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "\n${RED}⚠️  請設定以下環境變數：${NC}"
        for var in "${missing_vars[@]}"; do
            echo "   export $var=<value>"
        done
        exit 1
    fi
}

# 檢查資料庫連接
check_database() {
    echo -e "\n${BLUE}🗄️  檢查資料庫連接...${NC}"
    
    # 嘗試連接 PostgreSQL
    if command -v psql > /dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            echo -e "✅ ${GREEN}資料庫連接正常${NC}"
        else
            echo -e "❌ ${RED}資料庫連接失敗${NC}"
            exit 1
        fi
    else
        echo -e "⚠️  ${YELLOW}找不到 psql 命令，跳過資料庫連接檢查${NC}"
    fi
}

# 檢查 Redis 連接
check_redis() {
    echo -e "\n${BLUE}🔗 檢查 Redis 連接...${NC}"
    
    if command -v redis-cli > /dev/null 2>&1; then
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "✅ ${GREEN}Redis 連接正常${NC}"
        else
            echo -e "❌ ${RED}Redis 連接失敗${NC}"
            echo "請確保 Redis 服務正在運行"
            exit 1
        fi
    else
        echo -e "⚠️  ${YELLOW}找不到 redis-cli 命令，跳過 Redis 檢查${NC}"
    fi
}

# 執行資料庫遷移
run_migrations() {
    echo -e "\n${BLUE}🔄 執行資料庫遷移...${NC}"
    
    if npm run db:migrate > /dev/null 2>&1; then
        echo -e "✅ ${GREEN}資料庫遷移完成${NC}"
    else
        echo -e "❌ ${RED}資料庫遷移失敗${NC}"
        exit 1
    fi
}

# 檢查是否存在管理員用戶
check_admin_users() {
    echo -e "\n${BLUE}👤 檢查管理員用戶...${NC}"
    
    # 這裡需要實際查詢資料庫
    echo -e "⚠️  ${YELLOW}需要手動檢查資料庫中的用戶表${NC}"
    echo -e "   使用以下命令查詢："
    echo -e "   ${BLUE}psql \$DATABASE_URL -c \"SELECT id, email FROM user LIMIT 10;\"${NC}"
}

# 創建管理員用戶
create_admin_user() {
    echo -e "\n${BLUE}➕ 創建管理員用戶...${NC}"
    
    read -p "請輸入管理員郵件地址: " admin_email
    read -s -p "請輸入管理員密碼: " admin_password
    echo
    
    if [ -n "$admin_email" ] && [ -n "$admin_password" ]; then
        echo -e "\n${BLUE}正在創建管理員用戶...${NC}"
        if npx medusa user --email "$admin_email" --password "$admin_password"; then
            echo -e "✅ ${GREEN}管理員用戶創建成功！${NC}"
            echo -e "📧 郵件地址: $admin_email"
        else
            echo -e "❌ ${RED}管理員用戶創建失敗${NC}"
        fi
    else
        echo -e "❌ ${RED}郵件地址或密碼不能為空${NC}"
    fi
}

# 主要執行流程
main() {
    echo -e "\n${BLUE}開始檢查 Admin 登入系統...${NC}"
    
    # 載入環境變數
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
        echo -e "✅ ${GREEN}已載入 .env 檔案${NC}"
    elif [ -f ".env.vm" ]; then
        export $(cat .env.vm | grep -v '^#' | xargs)
        echo -e "✅ ${GREEN}已載入 .env.vm 檔案${NC}"
    else
        echo -e "⚠️  ${YELLOW}找不到環境變數檔案${NC}"
    fi
    
    check_env_vars
    check_database
    check_redis
    run_migrations
    check_admin_users
    
    echo -e "\n${BLUE}是否要創建新的管理員用戶？ (y/n)${NC}"
    read -p "> " create_user
    
    if [ "$create_user" = "y" ] || [ "$create_user" = "Y" ]; then
        create_admin_user
    fi
    
    echo -e "\n${GREEN}🎉 Admin 系統檢查完成！${NC}"
    echo -e "\n${BLUE}接下來您可以：${NC}"
    echo -e "1. 啟動服務: ${YELLOW}yarn dev${NC} 或 ${YELLOW}pm2 start ecosystem.config.js${NC}"
    echo -e "2. 訪問管理後台: ${YELLOW}http://localhost:9000/app${NC}"
    echo -e "3. 使用創建的管理員帳號登入"
}

# 執行主函數
main "$@"