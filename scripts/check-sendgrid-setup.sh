#!/bin/bash

# SendGrid 設定檢查腳本
echo "🔍 檢查 SendGrid 設定..."

# 檢查環境變數
if [ -z "$SENDGRID_API_KEY" ]; then
    echo "❌ SENDGRID_API_KEY 未設定"
    echo "請在 .env 檔案中設定: SENDGRID_API_KEY=SG.your_api_key_here"
else
    echo "✅ SENDGRID_API_KEY 已設定"
fi

if [ -z "$SENDGRID_FROM" ]; then
    echo "❌ SENDGRID_FROM 未設定"
    echo "請在 .env 檔案中設定: SENDGRID_FROM=noreply@yourdomain.com"
else
    echo "✅ SENDGRID_FROM 已設定: $SENDGRID_FROM"
fi

# 檢查必要檔案
echo ""
echo "🔍 檢查設定檔案..."

if [ -f "medusa-config.ts" ]; then
    echo "✅ medusa-config.ts 存在"
    
    if grep -q "@medusajs/medusa/notification-sendgrid" medusa-config.ts; then
        echo "✅ SendGrid 通知模組已配置"
    else
        echo "❌ SendGrid 通知模組未配置"
    fi
else
    echo "❌ medusa-config.ts 不存在"
fi

# 檢查 subscribers
echo ""
echo "🔍 檢查 Subscribers..."

if [ -f "src/subscribers/product-created.ts" ]; then
    echo "✅ 產品建立通知 subscriber 存在"
else
    echo "❌ 產品建立通知 subscriber 不存在"
fi

if [ -f "src/subscribers/order-placed.ts" ]; then
    echo "✅ 訂單完成通知 subscriber 存在"
else
    echo "❌ 訂單完成通知 subscriber 不存在"
fi

# 檢查工作流程
if [ -f "src/workflows/send-email.ts" ]; then
    echo "✅ 電子郵件工作流程存在"
else
    echo "❌ 電子郵件工作流程不存在"
fi

# 檢查 API 路由
if [ -f "src/api/admin/test-email/route.ts" ]; then
    echo "✅ 測試電子郵件 API 路由存在"
else
    echo "❌ 測試電子郵件 API 路由不存在"
fi

if [ -f "src/api/admin/test-password-reset/route.ts" ]; then
    echo "✅ 測試密碼重設 API 路由存在"
else
    echo "❌ 測試密碼重設 API 路由不存在"
fi

echo ""
echo "🏁 檢查完成！"
echo ""
echo "📝 下一步："
echo "1. 設定 SendGrid API 金鑰和寄件者郵箱"
echo "2. 在 SendGrid 中建立動態範本："
echo "   - product-created (產品建立通知)"
echo "   - order-confirmation (訂單確認)"
echo "   - customer-password-reset (客戶密碼重設)"
echo "   - admin-password-reset (管理員密碼重設)"
echo "3. 重新啟動 Medusa 伺服器"
echo "4. 測試功能："
echo "   - 建立產品測試產品通知"
echo "   - 完成訂單測試訂單確認"
echo "   - 使用 Medusa Admin 重設密碼功能"
echo "   - 使用 API 端點發送測試郵件"