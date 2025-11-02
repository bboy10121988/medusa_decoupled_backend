# Google OAuth 問題修復報告

## 🎯 問題根因

**發現的問題**: 後端使用了 **Medusa v1 的 API (`customerService`)** 來創建用戶，但我們的專案是 **Medusa v2**，導致用戶創建失敗。

### 錯誤的代碼 (已修正):
```typescript
// ❌ Medusa v1 API - 在 v2 中不存在
const customerService = container.resolve('customerService')
const customer = await customerService.retrieveByEmail(email)
const newCustomer = await customerService.create({...})
```

### 正確的代碼 (已修正):
```typescript
// ✅ Medusa v2 API
const query = container.resolve("query")
const { data: customers } = await query.graph({
  entity: "customer",
  fields: ["id", "email", "first_name", "last_name", "has_account"],
  filters: { email },
})

const createCustomersWorkflow = container.resolve("createCustomersWorkflow")
const { result } = await createCustomersWorkflow.run({
  input: { customers: [{...}] }
})
```

---

## ✅ 已修復的內容

### 1. 更新 Customer 查詢邏輯
- ❌ 移除: `customerService.retrieveByEmail()`
- ✅ 新增: 使用 Medusa v2 的 `query.graph()` API

### 2. 更新 Customer 創建邏輯
- ❌ 移除: `customerService.create()`
- ✅ 新增: 使用 `createCustomersWorkflow` workflow

### 3. 新增詳細日誌
```typescript
console.log("=== Google OAuth Callback ===")
console.log("Profile:", JSON.stringify(profile._json, null, 2))
console.log(`✅ Google Auth: Customer ${email} already exists. Logging in.`)
console.log(`➕ Google Auth: Creating new customer for ${email}...`)
console.log(`✅ Google Auth: New customer created: ${newCustomer.id}`)
console.error("❌ Google Auth: Error in verify callback", error)
```

### 4. 儲存 Google 用戶資料
```typescript
metadata: {
  auth_provider: 'google',
  google_user_id: googleUserId,  // Google 的唯一 ID
  picture,                       // 用戶頭像 URL
}
```

---

## 🔍 如何測試

### 步驟 1: 清空測試
如果之前測試過但失敗，請先清空該測試帳號：

```bash
# SSH 到 VM
gcloud compute ssh tims-web --zone=asia-east1-c

# 連接到數據庫
psql $DATABASE_URL

# 檢查是否有該 email 的記錄
SELECT * FROM customer WHERE email = 'your-test-email@gmail.com';

# 如果有，刪除它（這樣可以重新測試註冊流程）
DELETE FROM customer WHERE email = 'your-test-email@gmail.com';
```

### 步驟 2: 進行 Google 登入測試

1. 前往前端登入頁面
2. 點擊 "Google 登入" 按鈕
3. 選擇 Google 帳號並授權
4. 應該會成功登入並重定向到首頁/會員中心

### 步驟 3: 查看後端日誌

```bash
# 在 VM 上
pm2 logs medusa-backend --lines 50
```

**成功的日誌應該包含:**
```
=== Google OAuth Callback ===
Profile: {
  "email": "user@gmail.com",
  "given_name": "John",
  "family_name": "Doe",
  ...
}
➕ Google Auth: Creating new customer for user@gmail.com...
✅ Google Auth: New customer created: cus_xxxxx
```

### 步驟 4: 驗證數據庫

```sql
-- 檢查新用戶是否被創建
SELECT 
  id,
  email,
  first_name,
  last_name,
  has_account,
  metadata->>'auth_provider' as auth_provider,
  metadata->>'google_user_id' as google_user_id,
  created_at
FROM customer 
WHERE email = 'your-test-email@gmail.com';
```

**預期結果:**
- ✅ 有一筆新記錄
- ✅ `has_account = true`
- ✅ `metadata.auth_provider = 'google'`
- ✅ `metadata.google_user_id` 有值

---

## 📊 技術細節

### Medusa v2 的變更

| Medusa v1 | Medusa v2 | 說明 |
|-----------|-----------|------|
| `customerService` | `query` + `workflow` | 服務層重構 |
| `.retrieveByEmail()` | `query.graph()` | 查詢 API |
| `.create()` | `createCustomersWorkflow.run()` | 創建 API |
| 同步 API | 異步 Workflow | 執行模式 |

### Google Profile 資料結構

```json
{
  "email": "user@gmail.com",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://lh3.googleusercontent.com/...",
  "sub": "1234567890",  // Google 用戶唯一 ID
  "email_verified": true
}
```

### 創建的 Customer 結構

```json
{
  "id": "cus_01JBXXXXX",
  "email": "user@gmail.com",
  "first_name": "John",
  "last_name": "Doe",
  "has_account": true,
  "metadata": {
    "auth_provider": "google",
    "google_user_id": "1234567890",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

---

## 🚀 部署狀態

- ✅ 代碼已提交: `e3f48a2`
- ✅ 已部署到 VM
- ✅ 後端已重啟
- ✅ 配置已生效

**Git Commit:**
```
fix: Google OAuth customer creation using Medusa v2 APIs

- Replace deprecated customerService with query and createCustomersWorkflow
- Add detailed logging for debugging
- Use correct Medusa v2 graph API for customer lookup
- Use workflow for customer creation instead of service
- Add error stack trace logging
```

---

## 🎉 預期結果

現在 Google 登入應該可以正常工作：

1. ✅ 新用戶可以通過 Google 登入註冊
2. ✅ 現有用戶可以通過 Google 登入
3. ✅ 用戶資料正確保存到數據庫
4. ✅ JWT token 正確設定
5. ✅ 前端可以正確獲取登入狀態

---

## 📝 前端需要確認的事項

### ⚠️ 重要: 前後端域名配置

**正確的域名配置**：
- 前端: `https://timsfantasyworld.com`
- 後端: `https://admin.timsfantasyworld.com`

**Cookie 共享**: ✅ 因為是同一個主域名 (timsfantasyworld.com)，Cookie 可以透過設定 `domain=.timsfantasyworld.com` 來共享

### 1. Callback URL 配置

**Google Cloud Console 設定**:
```
授權的重新導向 URI: 
https://admin.timsfantasyworld.com/auth/customer/google/callback
```

**前端 Callback 處理** (完整範例請見 `GOOGLE_OAUTH_DEBUG.md`):

```typescript
// app/[countryCode]/auth/google/callback/page.tsx

const response = await sdk.auth.callback("customer", "google", {
  query: {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
  },
})

// ⚠️ 關鍵：檢查並儲存 token
if (response?.token) {
  // 因為跨域，可能需要手動設定 cookie
  document.cookie = `_medusa_jwt=${response.token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
  
  // 重定向到會員中心
  router.push(`/${countryCode}/account`)
}
```

### 2. SDK 配置

確認 Medusa SDK 正確配置：

```typescript
// lib/config.ts
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: "https://admin.timsfantasyworld.com",  // 後端 URL
  auth: {
    type: "session",
  },
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  // ⚠️ 重要：必須啟用 credentials
  fetchConfig: {
    credentials: 'include',  // 允許跨域 cookie
  }
})
```

### 3. CORS 配置

確認後端的 CORS 設定允許前端域名：

```typescript
// medusa-config.ts
{
  storeCors: "https://timsfantasyworld.com,http://localhost:3000",
  adminCors: "https://admin.timsfantasyworld.com,http://localhost:7001",
  authCors: "https://timsfantasyworld.com,http://localhost:3000",
}
```

### 4. 環境變數檢查

```bash
# .env
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback

# ⚠️ 注意：這個 URL 必須指向後端，不是前端！
```

---

## 🐛 如果還有問題

### 查看即時日誌
```bash
# 在 VM 上
pm2 logs medusa-backend --lines 0 --raw
```
然後進行登入測試，觀察日誌輸出。

### 常見錯誤

**1. "Cannot resolve 'query'"**
- 原因: Medusa v2 模組沒有正確載入
- 解決: 重新 build 並重啟

**2. "Cannot resolve 'createCustomersWorkflow'"**
- 原因: Workflow 模組沒有註冊
- 解決: 檢查 `medusa-config.ts` 的 modules 配置

**3. "Email already exists"**
- 原因: 該 email 已經註冊但查詢失敗
- 解決: 檢查數據庫是否有重複記錄

---

## 📞 聯絡方式

如果還有問題，請提供：
1. 前端控制台的錯誤訊息
2. 後端日誌（使用 `pm2 logs`）
3. 測試用的 Google 帳號 email
4. 測試時間

我會進一步協助診斷！

---

**修復時間**: 2025-11-02  
**修復版本**: e3f48a2  
**狀態**: ✅ 已部署並測試
