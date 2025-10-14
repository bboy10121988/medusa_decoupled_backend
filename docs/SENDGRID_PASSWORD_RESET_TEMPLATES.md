# SendGrid 密碼重設範本

## 客戶密碼重設範本 (customer-password-reset)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>重設密碼 - {{store_name}}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            background-color: #ffffff;
            margin: 0;
            padding: 20px;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            border: 1px solid #eaeaea;
            border-radius: 8px;
            padding: 40px;
            background-color: #ffffff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .title {
            color: #000000;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px 0;
        }
        .content {
            margin: 32px 0;
            line-height: 1.6;
        }
        .text {
            color: #333333;
            font-size: 16px;
            margin: 0 0 16px 0;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .reset-button {
            background: linear-gradient(135deg, #007bff, #0056b3);
            border-radius: 6px;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            text-align: center;
            padding: 16px 32px;
            display: inline-block;
            transition: all 0.3s ease;
        }
        .reset-button:hover {
            background: linear-gradient(135deg, #0056b3, #004085);
            transform: translateY(-1px);
        }
        .url-section {
            margin: 32px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .url-text {
            font-size: 14px;
            color: #666666;
            margin-bottom: 8px;
        }
        .url-link {
            color: #007bff;
            text-decoration: none;
            font-size: 14px;
            word-break: break-all;
            font-family: monospace;
        }
        .info-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
        }
        .info-text {
            color: #856404;
            font-size: 14px;
            margin: 0;
        }
        .security-footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 2px solid #eaeaea;
        }
        .security-text {
            color: #666666;
            font-size: 13px;
            line-height: 1.5;
            margin: 0 0 8px 0;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .footer-text {
            color: #999999;
            font-size: 12px;
            margin: 4px 0;
        }
        .highlight {
            background-color: #e3f2fd;
            padding: 2px 4px;
            border-radius: 3px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{{store_name}}</div>
            <h1 class="title">🔐 重設您的密碼</h1>
        </div>

        <div class="content">
            <p class="text">
                親愛的客戶 <span class="highlight">{{email}}</span>，
            </p>
            <p class="text">
                我們收到了重設您帳戶密碼的請求。點擊下方按鈕來建立新密碼：
            </p>
        </div>

        <div class="button-container">
            <a href="{{reset_url}}" class="reset-button">
                🔑 重設密碼
            </a>
        </div>

        <div class="url-section">
            <p class="url-text">
                如果按鈕無法使用，請複製並貼上以下連結到瀏覽器中：
            </p>
            <a href="{{reset_url}}" class="url-link">
                {{reset_url}}
            </a>
        </div>

        <div class="info-box">
            <p class="info-text">
                <strong>⏰ {{expiry_message}}</strong><br>
                為了您的帳戶安全，此重設連結有時間限制。
            </p>
        </div>

        <div class="security-footer">
            <p class="security-text">
                <strong>🛡️ 安全提醒：</strong>
            </p>
            <p class="security-text">
                • {{security_notice}}<br>
                • 請勿將此重設連結分享給任何人<br>
                • 如有疑問，請聯繫客服：{{support_email}}
            </p>
        </div>

        <div class="footer">
            <p class="footer-text">
                此郵件由 {{store_name}} 系統自動發送
            </p>
            <p class="footer-text">
                <a href="{{site_url}}" style="color: #007bff;">{{site_url}}</a>
            </p>
            <p class="footer-text">
                © {{current_year}} {{store_name}}. 版權所有。
            </p>
        </div>
    </div>
</body>
</html>
```

## 管理員密碼重設範本 (admin-password-reset)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理員密碼重設 - {{store_name}}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            border: 1px solid #d32f2f;
            border-radius: 8px;
            padding: 40px;
            background-color: #ffffff;
            box-shadow: 0 4px 15px rgba(211, 47, 47, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #d32f2f;
            margin-bottom: 10px;
        }
        .admin-badge {
            background: linear-gradient(135deg, #d32f2f, #b71c1c);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 16px;
            display: inline-block;
        }
        .title {
            color: #d32f2f;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px 0;
        }
        .content {
            margin: 32px 0;
            line-height: 1.6;
        }
        .text {
            color: #333333;
            font-size: 16px;
            margin: 0 0 16px 0;
        }
        .admin-info {
            background: linear-gradient(135deg, #ffebee, #fce4ec);
            border: 1px solid #f8bbd9;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .reset-button {
            background: linear-gradient(135deg, #d32f2f, #b71c1c);
            border-radius: 6px;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            text-align: center;
            padding: 16px 32px;
            display: inline-block;
            transition: all 0.3s ease;
        }
        .reset-button:hover {
            background: linear-gradient(135deg, #b71c1c, #8e0000);
            transform: translateY(-1px);
        }
        .url-section {
            margin: 32px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #d32f2f;
        }
        .url-text {
            font-size: 14px;
            color: #666666;
            margin-bottom: 8px;
        }
        .url-link {
            color: #d32f2f;
            text-decoration: none;
            font-size: 14px;
            word-break: break-all;
            font-family: monospace;
        }
        .security-alert {
            background-color: #fff3e0;
            border: 2px solid #ffb74d;
            border-radius: 6px;
            padding: 20px;
            margin: 24px 0;
        }
        .alert-title {
            color: #e65100;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 8px 0;
        }
        .alert-text {
            color: #bf360c;
            font-size: 14px;
            margin: 4px 0;
        }
        .security-footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 2px solid #d32f2f;
        }
        .security-text {
            color: #666666;
            font-size: 13px;
            line-height: 1.5;
            margin: 0 0 8px 0;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .footer-text {
            color: #999999;
            font-size: 12px;
            margin: 4px 0;
        }
        .highlight {
            background-color: #ffcdd2;
            padding: 2px 4px;
            border-radius: 3px;
            font-weight: 600;
            color: #d32f2f;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{{store_name}}</div>
            <div class="admin-badge">🛡️ 管理員帳戶</div>
            <h1 class="title">🔐 管理員密碼重設</h1>
        </div>

        <div class="admin-info">
            <p class="text">
                <strong>🚨 管理員帳戶安全通知</strong><br>
                管理員 <span class="highlight">{{email}}</span> 要求重設密碼
            </p>
        </div>

        <div class="content">
            <p class="text">
                您的管理員帳戶收到密碼重設請求。如果這是您本人的操作，請點擊下方按鈕繼續：
            </p>
        </div>

        <div class="button-container">
            <a href="{{reset_url}}" class="reset-button">
                🔑 重設管理員密碼
            </a>
        </div>

        <div class="url-section">
            <p class="url-text">
                如果按鈕無法使用，請複製並貼上以下連結到瀏覽器中：
            </p>
            <a href="{{reset_url}}" class="url-link">
                {{reset_url}}
            </a>
        </div>

        <div class="security-alert">
            <p class="alert-title">⚠️ 安全警告</p>
            <p class="alert-text">
                • 管理員帳戶具有系統完整存取權限<br>
                • {{expiry_message}}<br>
                • 如果您沒有要求重設密碼，請立即聯繫系統管理員<br>
                • 建議重設後立即檢查帳戶活動記錄
            </p>
        </div>

        <div class="security-footer">
            <p class="security-text">
                <strong>🛡️ 安全提醒：</strong>
            </p>
            <p class="security-text">
                • 請勿將此重設連結分享給任何人<br>
                • 使用強密碼，建議包含大小寫字母、數字和特殊符號<br>
                • 定期更新密碼以確保帳戶安全<br>
                • 如有安全疑慮，請聯繫：{{support_email}}
            </p>
        </div>

        <div class="footer">
            <p class="footer-text">
                此郵件由 {{store_name}} 管理系統自動發送
            </p>
            <p class="footer-text">
                管理後台：<a href="{{site_url}}" style="color: #d32f2f;">{{site_url}}</a>
            </p>
            <p class="footer-text">
                © {{current_year}} {{store_name}}. 版權所有。
            </p>
        </div>
    </div>
</body>
</html>
```

## 使用說明

### 1. 在 SendGrid 中建立範本

1. 登入 SendGrid 控制台
2. 前往 **Email API** > **Dynamic Templates**
3. 建立兩個新範本：
   - 範本名稱：`Customer Password Reset`，ID：`customer-password-reset`
   - 範本名稱：`Admin Password Reset`，ID：`admin-password-reset`

### 2. 設定範本內容

將對應的 HTML 程式碼貼入各自的範本中，並設定主旨：

**客戶密碼重設主旨：**
```
🔐 重設您的密碼 - {{store_name}}
```

**管理員密碼重設主旨：**
```
🚨 管理員密碼重設通知 - {{store_name}}
```

### 3. 可用變數

兩個範本都支援以下動態變數：
- `{{email}}` - 用戶電子郵件
- `{{reset_url}}` - 重設密碼連結
- `{{store_name}}` - 商店名稱
- `{{expiry_message}}` - 過期提醒訊息
- `{{security_notice}}` - 安全提醒
- `{{support_email}}` - 客服郵箱
- `{{site_url}}` - 網站連結
- `{{current_year}}` - 當前年份
- `{{user_type_display}}` - 用戶類型顯示

### 4. 測試範本

使用測試資料預覽範本效果，確保所有變數正確顯示。