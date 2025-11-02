# 前端 Google OAuth 測試指南

## 🎯 後端已準備完成!

### 後端配置狀態
- ✅ `callbackUrl` 已修復並指向正確的後端 URL
- ✅ OAuth endpoint 運作正常
- ✅ Callback 路由已部署
- ✅ 測試確認 `redirect_uri` 正確

### 前端最小改動 (5分鐘內完成)

#### 1. 修改 Google 登入按鈕

**位置**: 你們前端的登入頁面 (例如 `Login.tsx` 或 `AuthButtons.tsx`)

**修改前**:
```typescript
const handleGoogleLogin = async () => {
  try {
    const result = await sdk.auth.login("customer", "google", {
      callback_url: window.location.origin + "/auth/google/callback"
    })
    window.location.href = result.location
  } catch (error) {
    console.error("Google login failed:", error)
  }
}
```

**修改後** (只要一行!):
```typescript
const handleGoogleLogin = () => {
  window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
}
```

#### 2. Callback 頁面 (可選,用於顯示狀態)

**位置**: `app/[countryCode]/auth/google/callback/page.tsx`

**簡單版本**:
```typescript
'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function GoogleCallbackPage({ params }: { params: { countryCode: string } }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  useEffect(() => {
    if (success === 'true') {
      console.log('✅ Google OAuth 登入成功!')
      // 重定向到會員中心或首頁
      setTimeout(() => {
        router.push(`/${params.countryCode}/account`)
      }, 1000)
    } else if (error) {
      console.error('❌ Google OAuth 登入失敗:', error)
      // 顯示錯誤訊息或重定向到登入頁
      setTimeout(() => {
        router.push(`/${params.countryCode}/account/login`)
      }, 2000)
    }
  }, [success, error, router, params.countryCode])

  return (
    <div className="flex items-center justify-center min-h-screen">
      {success === 'true' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-600">登入成功!</h1>
          <p className="mt-2">正在跳轉...</p>
        </div>
      )}
      {error && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">登入失敗</h1>
          <p className="mt-2">錯誤: {error}</p>
          <p className="mt-4">正在返回登入頁...</p>
        </div>
      )}
      {!success && !error && (
        <div className="text-center">
          <p>處理中...</p>
        </div>
      )}
    </div>
  )
}
```

#### 3. 確認 SDK 配置 (應該已經有了)

**位置**: `lib/config.ts` 或類似文件

```typescript
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: "https://admin.timsfantasyworld.com",
  auth: { type: 'session' },
  fetchConfig: { credentials: 'include' },  // 重要!讓 cookie 可以跨域傳遞
})
```

## 🧪 測試步驟

### 1. 本地測試 (推薦先做)

```bash
# 在前端專案目錄
npm run dev
# 或
yarn dev
```

1. 打開瀏覽器到登入頁面
2. 打開 DevTools (F12)
3. 切到 Console 和 Network tab
4. 點擊「Google 登入」按鈕

**預期行為**:
- 瀏覽器跳轉到 `https://admin.timsfantasyworld.com/auth/customer/google`
- 立即被重定向到 Google 授權頁面 (`accounts.google.com`)
- 授權後回到 `https://timsfantasyworld.com/tw/auth/google/callback?success=true`
- 自動跳轉到會員中心

### 2. 檢查後端日誌 (如果有問題)

```bash
gcloud compute ssh tims-web --zone=asia-east1-c \
  --command="pm2 logs medusa-backend --lines 50"
```

**應該看到**:
```
=== /auth/customer/google/callback ===
📧 Customer email: user@gmail.com
✅ Customer already exists: cus_xxxxx
🔐 Generated JWT token
🍪 Set cookie: connect.sid
📤 Redirecting to: https://timsfantasyworld.com/tw/auth/google/callback?success=true
```

### 3. 檢查 Cookie

在 DevTools → Application → Cookies → `https://timsfantasyworld.com`:

應該看到:
- `connect.sid` (後端設定的 JWT cookie)
- Domain: `.timsfantasyworld.com`
- HttpOnly: ✅
- Secure: ✅
- SameSite: Lax

### 4. 測試登入狀態

登入後,測試這個 API:

```typescript
const customer = await sdk.auth.getSession()
console.log('當前用戶:', customer)
```

應該返回用戶資訊,包含:
```json
{
  "customer": {
    "id": "cus_xxxxx",
    "email": "user@gmail.com",
    "first_name": "...",
    "last_name": "...",
    "metadata": {
      "auth_provider": "google"
    }
  }
}
```

## ❗ 常見問題排查

### 問題 1: 登入後無法獲取 session

**症狀**: `sdk.auth.getSession()` 返回 null 或 401

**可能原因**:
1. Cookie 沒有正確設定
2. CORS 配置問題
3. `credentials: 'include'` 沒有設定

**解決方法**:
```typescript
// 確保所有 API 請求都帶上 credentials
fetch('https://admin.timsfantasyworld.com/store/...', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### 問題 2: 重定向後顯示 404

**症狀**: 授權完成後,前端顯示 404

**原因**: 前端沒有 callback 頁面

**解決方法**: 創建 `app/[countryCode]/auth/google/callback/page.tsx` (見上方範例)

### 問題 3: 一直停在 "處理中..."

**症狀**: Callback 頁面沒有 `success` 或 `error` 參數

**檢查**:
1. 後端是否正確重定向?
   ```bash
   curl -i 'https://admin.timsfantasyworld.com/auth/customer/google'
   ```
2. Google Cloud Console 授權重定向 URI 是否包含:
   ```
   https://admin.timsfantasyworld.com/auth/customer/google/callback
   ```

### 問題 4: CORS 錯誤

**症狀**: Console 顯示 CORS policy 錯誤

**檢查後端 .env.production**:
```bash
AUTH_CORS=https://timsfantasyworld.com,https://admin.timsfantasyworld.com
STORE_CORS=https://timsfantasyworld.com
COOKIE_DOMAIN=.timsfantasyworld.com
```

## 📝 Google Cloud Console 設定檢查

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案
3. 進入「API 和服務」→「憑證」
4. 編輯 OAuth 2.0 用戶端 ID

**確認「已授權的重新導向 URI」包含**:
```
https://admin.timsfantasyworld.com/auth/customer/google/callback
```

**不要包含**:
- ❌ `https://timsfantasyworld.com/auth/google/callback` (前端,不需要)
- ❌ `http://localhost:...` (開發環境可以另外加)

## 🎉 測試成功的標誌

1. ✅ 點擊登入按鈕後,瀏覽器跳轉到 Google
2. ✅ 授權後自動回到前端 callback 頁面
3. ✅ 顯示「登入成功」訊息
4. ✅ Cookie 已設定 (`connect.sid`)
5. ✅ `sdk.auth.getSession()` 返回用戶資訊
6. ✅ 可以正常存取需要登入的頁面
7. ✅ 後端 PM2 日誌顯示成功訊息

## 📞 需要幫助?

如果遇到問題,請提供:

1. **瀏覽器 Console 錯誤** (截圖或複製錯誤訊息)
2. **Network tab 的請求記錄** (特別是 `/auth/customer/google` 相關的)
3. **後端日誌**:
   ```bash
   gcloud compute ssh tims-web --zone=asia-east1-c \
     --command="pm2 logs medusa-backend --lines 100"
   ```
4. **Cookie 狀態** (DevTools → Application → Cookies)

---

**文檔創建日期**: 2025-11-02  
**後端版本**: Medusa v2 with @medusajs/auth-google  
**測試狀態**: ✅ 後端已就緒,等待前端測試
