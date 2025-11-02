# Google Cloud Console 設定指南

## 問題根因

**主要問題**: `GOOGLE_CALLBACK_URL` 設定錯誤,指向前端而非後端

**現況**:
```
GOOGLE_CALLBACK_URL=https://timsfantasyworld.com/auth/google/callback  ❌
```

**應該是**:
```
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback  ✅
```

---

## Google Cloud Console 完整設定

### 1. 訪問 OAuth 設定頁面

前往: https://console.cloud.google.com/apis/credentials

選擇你的專案 (Tim's Fantasy World 或相關專案)

---

### 2. 編輯 OAuth 2.0 Client ID

找到你的 OAuth 2.0 Client ID (應該是 `273789094137-...`)

點擊編輯 (鉛筆圖示)

---

### 3. 設定 Authorized redirect URIs

**必須包含以下 URI** (一字不差):

```
https://admin.timsfantasyworld.com/auth/customer/google/callback
```

**重要提醒**:
- ✅ 必須是 `https://`
- ✅ 必須是 `admin.timsfantasyworld.com` (後端域名)
- ✅ 路徑必須是 `/auth/customer/google/callback`
- ❌ 不要設定前端 URL (`timsfantasyworld.com`)
- ❌ 不要有多餘的尾部斜線

**為什麼?**
- Google OAuth 必須重定向到「後端」,由 Medusa 處理 token 交換
- 後端處理完成後會再重定向回前端

---

### 4. OAuth consent screen 設定

點擊左側 "OAuth consent screen"

#### User Type
```
External  ✅ (選擇此項)
```

#### App information
```
App name: Tim's Fantasy World
User support email: your-email@gmail.com
```

#### App domain
```
Application home page: https://timsfantasyworld.com
Application privacy policy link: https://timsfantasyworld.com/privacy
Application terms of service link: https://timsfantasyworld.com/terms
```

#### Authorized domains
```
timsfantasyworld.com
```

#### Developer contact information
```
Email addresses: your-email@gmail.com
```

---

### 5. Scopes 設定

點擊 "ADD OR REMOVE SCOPES"

**必須選擇以下 scopes**:

- ✅ `openid`
- ✅ `.../auth/userinfo.email` (查看你的電子郵件地址)
- ✅ `.../auth/userinfo.profile` (查看你的個人資訊)

**不需要其他敏感權限**

---

### 6. Test users (開發/測試階段)

如果 OAuth consent screen 狀態是 "Testing":

點擊 "ADD USERS"

加入測試用的 Gmail 帳號:
```
your-test-email@gmail.com
```

**注意**: 只有加入的測試帳號才能使用 Google 登入

---

### 7. 發布應用 (Production)

當測試完成後,點擊 "PUBLISH APP" 讓所有 Google 用戶都能使用

**發布前檢查清單**:
- ✅ Authorized redirect URIs 正確
- ✅ Scopes 只包含必要權限
- ✅ App information 完整
- ✅ Privacy policy 和 Terms 連結有效

---

## 後端環境變數設定

編輯 `.env` 檔案:

```bash
# Google OAuth 配置
GOOGLE_CLIENT_ID=your-client-id-from-google-cloud-console
GOOGLE_CLIENT_SECRET=your-client-secret-from-google-cloud-console
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
FRONTEND_URL=https://timsfantasyworld.com
COOKIE_DOMAIN=.timsfantasyworld.com
NODE_ENV=production
```

**關鍵點**:
1. `GOOGLE_CALLBACK_URL` 必須指向「後端」
2. `COOKIE_DOMAIN` 必須以 `.` 開頭 (允許跨子網域)
3. `COOKIE_DOMAIN` 不包含 `http://` 或 `https://`
4. 從 Google Cloud Console 取得實際的 Client ID 和 Client Secret

---

## 完整 OAuth 流程圖

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 使用者點擊「使用 Google 登入」                           │
│    前端: https://timsfantasyworld.com/tw/account            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 前端重定向到後端 OAuth 入口                              │
│    GET https://admin.timsfantasyworld.com/auth/customer/google│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 後端產生 Google OAuth URL 並重定向                      │
│    302 → https://accounts.google.com/o/oauth2/v2/auth?...  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 使用者在 Google 授權                                     │
│    (選擇帳號、同意權限)                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Google 重定向回「後端」callback                          │
│    GET https://admin.timsfantasyworld.com/auth/customer/    │
│        google/callback?code=xxx&state=xxx                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. 後端處理 callback                                         │
│    ✓ 用 code 交換 access_token                              │
│    ✓ 取得 Google 使用者資訊                                 │
│    ✓ 建立/查找 customer                                     │
│    ✓ 產生 JWT token                                         │
│    ✓ 設定 HTTP-only cookie (_medusa_jwt)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. 後端重定向回「前端」                                     │
│    302 → https://timsfantasyworld.com/tw/auth/google/       │
│          callback?success=true                              │
│    (Cookie 已自動設定在 .timsfantasyworld.com)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. 前端接收重定向                                            │
│    ✓ 顯示成功訊息                                           │
│    ✓ 重定向到會員中心: /tw/account                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. 前端請求使用者資料                                        │
│    GET https://admin.timsfantasyworld.com/store/customers/me│
│    (自動攜帶 _medusa_jwt cookie)                            │
│    ← Response: { id, email, first_name, ... }              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. 登入成功! 顯示會員中心頁面                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 關鍵點總結

### 後端 (Medusa)

1. **Callback URL 必須指向後端**
   ```
   GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
   ```

2. **Cookie 設定正確**
   ```typescript
   res.cookie('_medusa_jwt', token, {
     httpOnly: true,           // 前端 JS 無法讀取 (安全)
     secure: true,             // 只在 HTTPS 傳輸 (生產環境必須)
     sameSite: 'lax',          // 允許從 Google 跳轉時攜帶
     domain: '.timsfantasyworld.com',  // 跨子網域共享
     path: '/',
     maxAge: 30 * 24 * 60 * 60 * 1000  // 30 天
   })
   ```

3. **CORS 包含前端域名**
   ```typescript
   storeCors: "https://timsfantasyworld.com"
   authCors: "https://timsfantasyworld.com"
   ```

### 前端

1. **SDK 配置正確**
   ```typescript
   const sdk = new Medusa({
     baseUrl: "https://admin.timsfantasyworld.com",
     auth: { type: 'session' },
     fetchConfig: { credentials: 'include' }  // 重要!
   })
   ```

2. **所有請求都帶 credentials**
   ```typescript
   fetch('https://admin.timsfantasyworld.com/store/customers/me', {
     credentials: 'include'  // 攜帶 cookie
   })
   ```

3. **Google 登入按鈕**
   ```typescript
   // 方法 1: 直接重定向 (最簡單)
   window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
   
   // 方法 2: 使用 SDK
   const url = await sdk.auth.getAuthorizationUrl('customer', 'google')
   window.location.href = url
   ```

### Google Cloud Console

1. **Authorized redirect URIs**
   ```
   https://admin.timsfantasyworld.com/auth/customer/google/callback
   ```

2. **Scopes**
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

3. **OAuth consent screen**
   - User Type: External
   - Status: Published (生產環境)

---

## 常見錯誤排查

### 錯誤 1: `redirect_uri_mismatch`

**原因**: Google Cloud Console 的 Authorized redirect URIs 與後端設定不一致

**解決**:
1. 檢查 `.env` 中的 `GOOGLE_CALLBACK_URL`
2. 檢查 Google Cloud Console 的 Authorized redirect URIs
3. 確保兩者完全一致 (包括 https, 域名, 路徑)

### 錯誤 2: `401 Unauthorized` (POST /auth/session)

**原因**: Cookie 未正確設定或無法跨域

**解決**:
1. 確認 `COOKIE_DOMAIN=.timsfantasyworld.com`
2. 確認前端所有請求都有 `credentials: 'include'`
3. 確認後端 CORS 設定包含前端域名

### 錯誤 3: Cookie 在前端看不到

**這是正常的!** 

因為 cookie 是 `httpOnly`,前端 JavaScript 無法讀取。

**驗證方式**:
- Chrome DevTools → Application → Cookies
- 應該能看到 `_medusa_jwt` (即使無法透過 JS 讀取)

### 錯誤 4: 授權後停留在 Google 頁面

**原因**: Google 無法重定向回後端

**解決**:
1. 確認 Google Cloud Console 的 redirect URI 正確
2. 確認後端服務正在運行
3. 確認防火牆規則允許訪問

---

## 部署步驟

### 1. 更新 Google Cloud Console 設定

依照上方指南設定 Authorized redirect URIs

### 2. 在 VM 上執行修復腳本

```bash
# SSH 到 VM
gcloud compute ssh tims-web --zone=asia-east1-c

# 進入專案目錄
cd ~/projects/backend

# 執行修復腳本
./fix-google-oauth.sh

# 查看日誌
pm2 logs medusa-backend --lines 0
```

### 3. 測試 OAuth flow

```bash
# 在本機執行測試腳本
./test-google-oauth.sh
```

### 4. 在瀏覽器中測試

1. 訪問 https://timsfantasyworld.com/tw/account
2. 點擊「使用 Google 登入」
3. 授權後應該自動登入並進入會員中心

---

## 檢查清單

部署前確認:

- [ ] `.env` 中 `GOOGLE_CALLBACK_URL` 指向後端
- [ ] `.env` 中 `COOKIE_DOMAIN=.timsfantasyworld.com`
- [ ] Google Cloud Console Authorized redirect URIs 更新
- [ ] 後端服務運行正常 (`pm2 status`)
- [ ] 前端 SDK 配置有 `credentials: 'include'`
- [ ] CORS 設定包含前端域名

測試時確認:

- [ ] Google 授權頁面正常顯示
- [ ] 授權後重定向回前端
- [ ] 前端顯示成功訊息
- [ ] 會員中心頁面顯示使用者資料
- [ ] 後端日誌顯示成功訊息
- [ ] 資料庫中有新的 customer 記錄 (首次登入)

---

建立日期: 2025-11-02  
最後更新: 2025-11-02
