# SendGrid 電子郵件通知設定指南

## 📧 概述

本專案整合了 SendGrid 作為主要的電子郵件通知服務，支援產品建立通知、訂單確認郵件等多種電子郵件功能。

## 🚀 快速設定

### 1. 註冊 SendGrid 帳號

1. 前往 [SendGrid 官網](https://signup.sendgrid.com) 註冊帳號
2. 驗證您的電子郵件地址
3. 完成帳號設定

### 2. 設定單一寄件者 (Sender Authentication)

1. 登入 SendGrid 控制台
2. 前往 **Settings** > **Sender Authentication**
3. 選擇 **Single Sender Verification**
4. 填入您的寄件者資訊：
   - **From Name**: Tim's Fantasy World
   - **From Email**: noreply@timsfantasyworld.com
   - **Reply To**: support@timsfantasyworld.com
5. 驗證寄件者電子郵件

### 3. 取得 API 金鑰

1. 前往 **Settings** > **API Keys**
2. 點擊 **Create API Key**
3. 選擇 **Restricted Access**
4. 設定權限：
   - **Mail Send**: Full Access
   - **Template Engine**: Read Access
5. 複製產生的 API 金鑰

### 4. 設定環境變數

在 `.env` 檔案中加入：

```bash
# SendGrid 設定
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM=noreply@timsfantasyworld.com
```

## 📧 建立 SendGrid 範本

### 產品建立通知範本

1. 前往 **Email API** > **Dynamic Templates**
2. 點擊 **Create a Dynamic Template**
3. 範本名稱：`Product Created Notification`
4. 範本 ID：`product-created`
5. 建立版本並設計範本：

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>新產品已建立</title>
</head>
<body>
    <h1>🎉 新產品已建立</h1>
    <div>
        <h2>{{product_title}}</h2>
        {{#if product_image}}
        <img src="{{product_image}}" alt="{{product_title}}" style="max-width: 300px;">
        {{/if}}
        
        <p>{{product_description}}</p>
        
        <div>
            <a href="{{product_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                查看產品
            </a>
            <a href="{{admin_url}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-left: 10px;">
                管理產品
            </a>
        </div>
    </div>
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p>此郵件由 Tim's Fantasy World 系統自動發送</p>
    </footer>
</body>
</html>
```

### 訂單確認範本

1. 建立新範本：`Order Confirmation`
2. 範本 ID：`order-confirmation`
3. 範本內容：

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>訂單確認 - {{order_id}}</title>
</head>
<body>
    <h1>📦 感謝您的訂購！</h1>
    
    <p>親愛的 {{customer_name}}，</p>
    <p>我們已收到您的訂單，以下是訂單詳情：</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>訂單資訊</h3>
        <p><strong>訂單編號：</strong>{{order_id}}</p>
        <p><strong>訂單日期：</strong>{{order_date}}</p>
        <p><strong>總金額：</strong>{{currency}} {{total_amount}}</p>
    </div>
    
    <div>
        <h3>商品清單</h3>
        {{#each items}}
        <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <p><strong>{{title}}</strong></p>
            <p>數量: {{quantity}} | 單價: {{unit_price}} | 小計: {{total}}</p>
        </div>
        {{/each}}
    </div>
    
    {{#if shipping_address}}
    <div style="margin-top: 20px;">
        <h3>配送地址</h3>
        <p>{{shipping_address.first_name}} {{shipping_address.last_name}}</p>
        <p>{{shipping_address.address_1}}</p>
        {{#if shipping_address.address_2}}<p>{{shipping_address.address_2}}</p>{{/if}}
        <p>{{shipping_address.city}} {{shipping_address.postal_code}}</p>
    </div>
    {{/if}}
    
    <div style="margin-top: 30px;">
        <a href="{{order_url}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
            查看訂單詳情
        </a>
    </div>
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p>如有任何問題，請聯繫我們的客服團隊。</p>
        <p>{{store_name}} | <a href="{{store_url}}">{{store_url}}</a></p>
    </footer>
</body>
</html>
```

## 🧪 測試設定

### 1. 測試 API 端點

使用 POST 請求測試郵件發送：

```bash
curl -X POST "https://admin.timsfantasyworld.com/admin/test-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "to": "test@example.com",
    "template": "product-created",
    "data": {
      "product_title": "測試產品",
      "product_description": "這是一個測試產品",
      "product_url": "https://timsfantasyworld.com/products/test",
      "admin_url": "https://admin.timsfantasyworld.com/products/test"
    }
  }'
```

### 2. 建立產品測試

1. 登入 Medusa Admin
2. 建立新產品
3. 檢查是否收到電子郵件通知

### 3. 查看日誌

```bash
# 檢查後端日誌
tail -f backend.log | grep "📧\|✅\|❌"
```

## 🔧 自定義範本

### 可用的資料變數

#### 產品建立通知
- `product_title`: 產品標題
- `product_description`: 產品描述
- `product_image`: 產品圖片 URL
- `product_url`: 產品頁面 URL
- `admin_url`: 管理後台 URL

#### 訂單確認
- `customer_name`: 客戶姓名
- `order_id`: 訂單 ID
- `order_date`: 訂單日期
- `total_amount`: 總金額
- `currency`: 貨幣代碼
- `items`: 商品清單陣列
- `shipping_address`: 配送地址物件
- `store_name`: 商店名稱
- `store_url`: 商店 URL
- `order_url`: 訂單詳情 URL

## 🚨 故障排除

### 常見問題

1. **API 金鑰無效**
   - 檢查 `SENDGRID_API_KEY` 是否正確
   - 確認 API 金鑰有 Mail Send 權限

2. **寄件者未驗證**
   - 確認 Single Sender Verification 已完成
   - 檢查 `SENDGRID_FROM` 郵箱是否已驗證

3. **範本不存在**
   - 確認 SendGrid 中已建立對應的動態範本
   - 檢查範本 ID 是否正確

4. **郵件未收到**
   - 檢查垃圾郵件資料夾
   - 查看 SendGrid Activity Feed
   - 檢查後端日誌

### 除錯模式

在開發環境中，如果未設定 SendGrid，系統會自動使用 Local 提供者，郵件內容會輸出到控制台。

## 📊 監控與分析

1. 登入 SendGrid 控制台
2. 前往 **Statistics** 查看發送統計
3. 使用 **Activity Feed** 追蹤個別郵件狀態
4. 設定 **Alerts** 監控發送失敗

## 🔒 安全最佳實務

1. **API 金鑰管理**
   - 定期輪換 API 金鑰
   - 使用最小權限原則
   - 不要在程式碼中硬編碼金鑰

2. **DKIM/SPF 設定**
   - 設定 Domain Authentication
   - 提高郵件送達率

3. **監控異常活動**
   - 設定發送限制
   - 監控退信率
   - 追蹤垃圾郵件投訴

---

*此文檔最後更新：2024年10月13日*