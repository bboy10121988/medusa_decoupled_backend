#!/bin/bash

# 管理員訂單通知測試腳本
# 使用方法: ./test-admin-notification.sh

echo "🧪 管理員訂單通知測試工具"
echo "=================================="

# 讀取環境變數
ADMIN_EMAIL=$(grep "^ADMIN_EMAIL=" .env | cut -d'=' -f2)
RESEND_API_KEY=$(grep "^RESEND_API_KEY=" .env | cut -d'=' -f2)
FROM_EMAIL=$(grep "^RESEND_FROM_EMAIL=" .env | cut -d'=' -f2)

# 檢查必要的環境變數
if [ -z "$ADMIN_EMAIL" ]; then
    echo "❌ 錯誤: 找不到 ADMIN_EMAIL 設定"
    echo "請在 .env 檔案中設定 ADMIN_EMAIL=your-email@domain.com"
    exit 1
fi

if [ -z "$RESEND_API_KEY" ]; then
    echo "❌ 錯誤: 找不到 RESEND_API_KEY 設定"
    exit 1
fi

if [ -z "$FROM_EMAIL" ]; then
    echo "❌ 錯誤: 找不到 RESEND_FROM_EMAIL 設定"
    exit 1
fi

echo "📧 郵件設定:"
echo "   寄件人: $FROM_EMAIL"
echo "   收件人: $ADMIN_EMAIL"
echo ""

# 生成測試訂單編號
ORDER_ID="TEST-$(date +%s)"
TEST_DATE=$(date '+%Y年%m月%d日 %H:%M')

echo "📋 測試訂單資訊:"
echo "   訂單編號: $ORDER_ID"
echo "   測試時間: $TEST_DATE"
echo ""

echo "🚀 發送測試郵件中..."

# 發送測試郵件
RESPONSE=$(curl -s -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{
    \"from\": \"$FROM_EMAIL\",
    \"to\": [\"$ADMIN_EMAIL\"],
    \"subject\": \"🧪 管理員訂單通知測試 - $TEST_DATE\",
    \"html\": \"<div style='font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;'><div style='background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'><div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;'><h1 style='margin: 0; font-size: 28px; font-weight: 600;'>🎉 新訂單通知</h1><p style='margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;'>Tim's Fantasy World</p></div><div style='padding: 30px 20px;'><div style='background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #2196f3;'><p style='margin: 0; color: #1976d2; font-weight: 600;'>✅ 這是一封測試郵件</p><p style='margin: 5px 0 0 0; color: #666; font-size: 14px;'>用於驗證管理員訂單通知功能</p></div><div style='margin-bottom: 25px;'><h2 style='color: #333; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;'>📋 訂單資訊</h2><div style='background: #fafafa; padding: 15px; border-radius: 8px;'><p style='margin: 8px 0;'><strong>訂單編號:</strong> <span style='color: #666;'>$ORDER_ID</span></p><p style='margin: 8px 0;'><strong>訂單時間:</strong> <span style='color: #666;'>$TEST_DATE</span></p><p style='margin: 8px 0;'><strong>客戶姓名:</strong> <span style='color: #666;'>測試客戶</span></p><p style='margin: 8px 0;'><strong>客戶信箱:</strong> <span style='color: #666;'>test@example.com</span></p></div></div><div style='margin-bottom: 25px;'><h3 style='color: #333; font-size: 18px; margin-bottom: 15px;'>🛍️ 商品明細</h3><div style='background: white; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;'><div style='padding: 15px; border-bottom: 1px solid #f0f0f0;'><div style='display: flex; justify-content: space-between; align-items: center;'><div><strong style='color: #333;'>測試商品 A</strong><br><small style='color: #666;'>數量: 2 × TWD 500</small></div><div style='color: #4caf50; font-weight: 600; font-size: 16px;'>TWD 1,000</div></div></div><div style='padding: 15px;'><div style='display: flex; justify-content: space-between; align-items: center;'><div><strong style='color: #333;'>測試商品 B</strong><br><small style='color: #666;'>數量: 1 × TWD 500</small></div><div style='color: #4caf50; font-weight: 600; font-size: 16px;'>TWD 500</div></div></div></div><div style='text-align: right; margin-top: 15px; padding: 15px; background: #e8f5e8; border-radius: 8px;'><div style='font-size: 20px; font-weight: bold; color: #2e7d32;'>訂單總額: TWD 1,500</div></div></div><div style='margin-bottom: 25px;'><h3 style='color: #333; font-size: 18px; margin-bottom: 15px;'>📦 配送資訊</h3><div style='background: #fafafa; padding: 15px; border-radius: 8px;'><p style='margin: 8px 0;'><strong>收件人:</strong> <span style='color: #666;'>張三</span></p><p style='margin: 8px 0;'><strong>配送地址:</strong> <span style='color: #666;'>台北市信義區信義路五段 7 號 101 大樓 50 樓</span></p><p style='margin: 8px 0;'><strong>郵遞區號:</strong> <span style='color: #666;'>110</span></p></div></div><div style='text-align: center; margin: 30px 0;'><a href='${process.env.BACKEND_URL || 'http://localhost:9000'}/admin/orders/$ORDER_ID' style='display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);'>🔗 查看訂單詳情</a></div></div><div style='background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;'><p style='margin: 0;'>此郵件由 <strong>Tim's Fantasy World</strong> 管理系統自動發送</p><p style='margin: 5px 0 0 0;'>如果您收到這封測試郵件，表示管理員訂單通知功能正常運作！✅</p><p style='margin: 10px 0 0 0; font-size: 11px; color: #999;'>測試時間: $(date)</p></div></div></div>\"
  }")

# 檢查回應
if [[ $RESPONSE == *"\"id\":"* ]]; then
    EMAIL_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "✅ 測試郵件發送成功！"
    echo ""
    echo "📬 郵件詳情:"
    echo "   郵件 ID: $EMAIL_ID"
    echo "   收件人: $ADMIN_EMAIL"
    echo "   主旨: 🧪 管理員訂單通知測試 - $TEST_DATE"
    echo ""
    echo "📋 請檢查以下位置:"
    echo "   📥 收件匣: $ADMIN_EMAIL"
    echo "   🗑️  垃圾郵件資料夾 (Gmail/Outlook)"
    echo "   ⏰ 郵件可能需要 1-2 分鐘才會送達"
    echo ""
    echo "🔗 Resend 郵件追蹤: https://resend.com/emails/$EMAIL_ID"
else
    echo "❌ 測試郵件發送失敗!"
    echo "回應: $RESPONSE"
fi