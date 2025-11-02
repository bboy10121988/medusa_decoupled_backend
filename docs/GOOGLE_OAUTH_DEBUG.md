# Google OAuth 測試失敗診斷指南

**日期**: 2025-11-02  
**狀態**: 🔍 診斷中

---

## 🎯 問題分析

根據測試報告，問題出在：**Google callback 成功，但用戶無法進入會員中心**

### 可能的根本原因

#### 原因 1: 前端 Callback 處理不完整 (最可能)

**症狀**:
- Google 重定向回前端 `/tw/auth/google/callback?code=xxx&state=xxx` ✅
- 前端調用 `sdk.auth.callback()` ✅
- 但用戶未登入 ❌

**分析**:
Medusa v2 的 OAuth 流程如下：

```
1. 前端調用 GET /auth/customer/google
   ↓
2. 後端返回 Google OAuth URL
   ↓
3. 用戶在 Google 授權
   ↓
4. Google 重定向到: https://tims.com.tw/tw/auth/google/callback?code=xxx&state=xxx
   ↓
5. 前端接收到 code 和 state
   ↓
6. ⚠️ 關鍵步驟：前端必須調用後端 /auth/customer/google/callback
   ↓
7. 後端驗證 code，創建/查找用戶，返回 JWT token
   ↓
8. 前端接收 token，設定 cookie
   ↓
9. 用戶登入成功
```

**問題可能在步驟 6-8**：
- 前端可能沒有正確調用後端的 callback endpoint
- 或者調用了，但沒有正確處理返回的 token
- 或者 cookie 沒有正確設定

#### 原因 2: CORS 配置問題

**症狀**: Cookie 無法跨域設定

**檢查**:
```typescript
// medusa-config.ts
{
  store_cors: "https://tims.com.tw",  // ⚠️ 必須包含前端域名
  admin_cors: "https://admin.timsfantasyworld.com"
}
```

**解決**: 確保 CORS 配置包含前端域名

#### 原因 3: Cookie Domain 設定問題

**症狀**: Cookie 在不同子域名間無法共享

**配置**: 
- 後端: `admin.timsfantasyworld.com`
- 前端: `timsfantasyworld.com`
- 主域名相同，Cookie 可以透過 `domain=.timsfantasyworld.com` 共享

**解決**: 確保 Cookie 設定包含正確的 domain 屬性

---

## 🔍 立即診斷步驟

### 步驟 1: 檢查後端日誌

```bash
# SSH 到 VM
gcloud compute ssh tims-web --zone=asia-east1-c

# 清空日誌，準備新測試
pm2 flush medusa-backend

# 實時查看日誌
pm2 logs medusa-backend --lines 0
```

### 步驟 2: 進行測試並記錄

**前端測試時，後端應該看到以下日誌**:

```
[預期日誌 1] 當前端點擊 "Google 登入" 按鈕
GET /auth/customer/google
→ 返回 Google OAuth URL

[預期日誌 2] 當 Google 重定向回後端
GET /auth/customer/google/callback?code=xxx&state=xxx
=== Google OAuth Callback ===
Profile: {
  "email": "user@gmail.com",
  ...
}
➕ Google Auth: Creating new customer for user@gmail.com...
✅ Google Auth: New customer created: cus_xxxxx
```

**如果沒有看到 [預期日誌 2]**:
→ **問題確認**: 前端沒有正確調用後端的 callback endpoint，或 Google 直接重定向到前端而非後端

### 步驟 3: 檢查數據庫

```bash
# 在 VM 上
psql $DATABASE_URL << EOF
-- 查看最近創建的 customer
SELECT 
  id,
  email,
  first_name,
  has_account,
  metadata->>'auth_provider' as provider,
  created_at
FROM customer 
ORDER BY created_at DESC 
LIMIT 5;
EOF
```

**如果沒有新記錄**:
→ **問題確認**: verify callback 沒有被執行

---

## 🔧 修復方案

### 方案 A: 前端正確實現 Callback 處理 (推薦)

#### 前端需要做的事情：

**檔案**: `app/[countryCode]/auth/google/callback/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { sdk } from '@/lib/config'  // Medusa SDK

export default function GoogleCallbackPage({ params }: { params: { countryCode: string } }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const { countryCode } = params

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("🔵 Step 1: Google callback page loaded")
        
        // 獲取 URL 參數
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        
        console.log("🔵 Step 2: URL params:", { code: code?.substring(0, 10), state })
        
        if (!code || !state) {
          throw new Error('Missing authorization code or state')
        }

        console.log("🔵 Step 3: Calling backend callback...")
        
        // ⚠️ 關鍵：調用後端的 callback endpoint
        const response = await sdk.auth.callback("customer", "google", {
          query: {
            code,
            state,
          },
        })
        
        console.log("🟢 Step 4: Backend callback successful!", response)
        
        // ⚠️ 關鍵：檢查是否有 token
        if (response?.token) {
          console.log("🟢 Step 5: Token received, storing in cookie...")
          
          // 設定 cookie (如果 SDK 沒有自動設定)
          document.cookie = `_medusa_jwt=${response.token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
          
          console.log("🟢 Step 6: Redirecting to account page...")
          
          // 重定向到會員中心
          router.push(`/${countryCode}/account`)
        } else {
          throw new Error('No token received from backend')
        }
        
      } catch (err) {
        console.error("❌ Google OAuth callback error:", err)
        setError(err.message || 'Authentication failed')
        
        // 顯示錯誤並重定向到登入頁
        setTimeout(() => {
          router.push(`/${countryCode}/account?error=oauth_failed`)
        }, 3000)
      }
    }

    handleCallback()
  }, [searchParams, router, countryCode])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">登入失敗</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">正在重定向到登入頁...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">正在完成 Google 登入...</p>
        <p className="text-sm text-gray-500 mt-2">請稍候，不要關閉此頁面</p>
      </div>
    </div>
  )
}
```

#### 前端 SDK 配置檢查：

**檔案**: `lib/config.ts` (或類似檔案)

```typescript
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: "https://admin.timsfantasyworld.com",  // ⚠️ 確認後端 URL
  auth: {
    type: "session",  // ⚠️ 使用 session 模式
  },
  // ⚠️ 關鍵：必須啟用 credentials
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  apiKey: undefined,
  // 確保請求帶上 credentials
  fetchConfig: {
    credentials: 'include',  // ⚠️ 必須設定！
  }
})
```

### 方案 B: 後端配置檢查

#### 1. 確認 CORS 配置

**檔案**: `medusa-config.ts`

```typescript
module.exports = defineConfig({
  projectConfig: {
    http: {
      // ⚠️ 必須包含前端域名
      storeCors: "https://tims.com.tw,http://localhost:3000",
      adminCors: "https://admin.timsfantasyworld.com,http://localhost:7001",
      
      // ⚠️ 關鍵：authCors 也要包含
      authCors: "https://tims.com.tw,http://localhost:3000",
      
      jwtSecret: process.env.JWT_SECRET || 'your-secret',
      cookieSecret: process.env.COOKIE_SECRET || 'your-secret',
    }
  }
})
```

#### 2. 確認 Google Callback URL

**檔案**: `.env`

```bash
# ⚠️ 這個 URL 應該指向後端，不是前端！
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
```

**Google Cloud Console 配置**:
- 授權的重新導向 URI: `https://admin.timsfantasyworld.com/auth/customer/google/callback`

---

## 🎯 完整測試流程

### 測試步驟：

1. **清空瀏覽器 Cookie**
   ```
   開發者工具 → Application → Cookies → 刪除所有 timsfantasyworld.com 的 cookies
   ```

2. **清空後端日誌**
   ```bash
   gcloud compute ssh tims-web --zone=asia-east1-c --command="pm2 flush medusa-backend"
   ```

3. **開啟後端日誌監控**
   ```bash
   gcloud compute ssh tims-web --zone=asia-east1-c --command="pm2 logs medusa-backend --lines 0"
   ```

4. **前端瀏覽器開啟 Console**
   ```
   F12 → Console → 清空日誌
   ```

5. **開始測試**
   - 訪問 `https://timsfantasyworld.com/tw/account`
   - 點擊 "使用 Google 登入"
   - 完成 Google 授權
   - **觀察前端 Console 日誌**
   - **觀察後端 PM2 日誌**

### 成功的標誌：

**前端 Console**:
```
🔵 Step 1: Google callback page loaded
🔵 Step 2: URL params: { code: "4/0AY0e-g...", state: "xxx" }
🔵 Step 3: Calling backend callback...
🟢 Step 4: Backend callback successful! { token: "eyJhbGc..." }
🟢 Step 5: Token received, storing in cookie...
🟢 Step 6: Redirecting to account page...
```

**後端日誌**:
```
GET /auth/customer/google/callback?code=xxx&state=xxx
=== Google OAuth Callback ===
Profile: { "email": "test@gmail.com", ... }
➕ Google Auth: Creating new customer for test@gmail.com...
✅ Google Auth: New customer created: cus_01JBXXXXX
```

**數據庫**:
```sql
SELECT * FROM customer WHERE email = 'test@gmail.com';
-- 應該有一筆新記錄
```

---

## 🐛 常見問題排查

### 問題 1: 前端 Console 沒有任何日誌

**原因**: Callback 頁面沒有執行
**解決**: 檢查前端路由配置，確保 `/auth/google/callback` 路由存在

### 問題 2: 前端日誌到 Step 3 就停止

**原因**: 後端 callback 請求失敗
**檢查**: 
1. Network 標籤查看請求狀態碼
2. 是否有 CORS 錯誤
3. 後端是否收到請求

### 問題 3: 後端日誌顯示 "Cannot resolve 'query'"

**原因**: Medusa v2 模組未正確載入
**解決**: 
```bash
# 重新 build
cd ~/projects/backend
yarn build
pm2 restart medusa-backend
```

### 問題 4: 後端日誌顯示 "Cannot resolve 'createCustomersWorkflow'"

**原因**: Workflow 未註冊
**解決**: 檢查 medusa-config.ts 的 modules 配置

### 問題 5: Token 收到但重定向後仍未登入

**原因**: Cookie 沒有正確設定或跨域問題
**解決**: 
1. 檢查 Cookie domain 設定
2. 確認 sameSite 屬性
3. 確認 secure 屬性 (生產環境必須 true)

---

## 📞 需要提供的診斷資訊

請前端工程師完成測試後，提供以下資訊：

### 1. 前端 Console 日誌 (完整)
```
截圖或複製所有 console.log 輸出
```

### 2. 前端 Network 請求
```
開發者工具 → Network → 找到以下請求並提供 Response:
- GET /auth/customer/google
- GET /auth/customer/google/callback?code=...
```

### 3. 前端 Cookie 狀態
```
開發者工具 → Application → Cookies
檢查是否有 _medusa_jwt cookie
如果有，提供其 attributes
```

### 4. 測試用 Email
```
實際測試使用的 Google 帳號 email
```

### 5. 錯誤訊息 (如果有)
```
任何紅色的錯誤訊息
```

---

## 🚀 後續步驟

1. **前端實現方案 A 的 callback 處理邏輯**
2. **進行完整測試**
3. **根據測試結果調整**
4. **如果還有問題，提供診斷資訊**

---

**建立日期**: 2025-11-02  
**更新日期**: 2025-11-02  
**狀態**: 等待前端測試
