# 前端整合 - Google 登入

> **給前端工程師**: 這份文檔包含完整的 Google OAuth 整合步驟、代碼範例和測試方法。

---

## 📋 目錄

1. [快速開始](#快速開始)
2. [必要修改](#必要修改)
3. [完整代碼範例](#完整代碼範例)
4. [測試流程](#測試流程)
5. [常見問題](#常見問題)

---

## 快速開始

### 🎯 核心概念

**Google OAuth 流程** (3 個步驟):

```
1. 前端按鈕點擊
   ↓
2. 導向後端 → Google 授權 → 後端處理
   ↓
3. 返回前端 (已登入)
```

**重要 URL**:
- 前端: `https://timsfantasyworld.com`
- 後端: `https://admin.timsfantasyworld.com`
- 登入入口: `https://admin.timsfantasyworld.com/auth/customer/google`
- 前端 Callback: `/tw/auth/google/callback` (你們前端的頁面)

### ⏱️ 預計時間

- 修改登入按鈕: **2 分鐘**
- 創建 Callback 頁面: **5 分鐘**
- 測試驗證: **3 分鐘**

**總計: 約 10 分鐘**

---

## 必要修改

### 1️⃣ 修改 Google 登入按鈕 (必須)

找到你們的登入按鈕代碼,通常在:
- `components/LoginForm.tsx`
- `components/AuthButtons.tsx`
- `app/[countryCode]/account/login/page.tsx`

#### ❌ 舊代碼 (請刪除)

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

#### ✅ 新代碼 (使用這個)

```typescript
const handleGoogleLogin = async () => {
  try {
    // 1. 向後端請求 OAuth URL (這會建立 session)
    const response = await fetch(
      'https://admin.timsfantasyworld.com/auth/customer/google',
      {
        method: 'GET',
        credentials: 'include', // ⭐️ 重要!建立並保存 session
        headers: {
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to get OAuth URL')
    }
    
    const data = await response.json()
    
    // 2. 重定向到 Google (保持同一個 session)
    if (data.location) {
      window.location.href = data.location
    }
    
  } catch (error) {
    console.error('Google login failed:', error)
    // 顯示錯誤訊息給使用者
  }
}
```

**重要**: Medusa v2 的 `@medusajs/auth-google` 預設回傳 JSON,需要前端取得 URL 後再重定向。

### 2️⃣ 創建 Callback 頁面 (必須)

**位置**: `app/[countryCode]/auth/google/callback/page.tsx`

**完整代碼**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function GoogleCallbackPage({ 
  params 
}: { 
  params: { countryCode: string } 
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'true') {
      setStatus('success')
      console.log('✅ Google 登入成功!')
      
      // 1 秒後跳轉到會員中心
      setTimeout(() => {
        router.push(`/${params.countryCode}/account`)
      }, 1000)
      
    } else if (error) {
      setStatus('error')
      console.error('❌ Google 登入失敗:', error)
      
      // 2 秒後返回登入頁
      setTimeout(() => {
        router.push(`/${params.countryCode}/account/login`)
      }, 2000)
    }
  }, [searchParams, router, params.countryCode])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">處理登入中...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <svg className="w-16 h-16 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">登入成功!</h1>
            <p className="mt-2 text-gray-600">正在跳轉到會員中心...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <svg className="w-16 h-16 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">登入失敗</h1>
            <p className="mt-2 text-gray-600">錯誤: {searchParams.get('error')}</p>
            <p className="mt-4 text-sm text-gray-500">正在返回登入頁...</p>
          </>
        )}
      </div>
    </div>
  )
}
```

### 3️⃣ 確認 SDK 配置 (應該已經有)

**位置**: `lib/config.ts` 或 `lib/data/index.ts`

```typescript
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: "https://admin.timsfantasyworld.com",
  auth: { 
    type: 'session' 
  },
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  fetchConfig: { 
    credentials: 'include'  // ⭐ 重要!讓 cookie 可以跨域
  },
})
```

**檢查重點**:
- ✅ `baseUrl` 指向後端
- ✅ `credentials: 'include'` 已設定
- ✅ `auth.type` 是 `'session'` (不是 'jwt')

---

## 完整代碼範例

### 登入按鈕組件

```typescript
// components/GoogleLoginButton.tsx
'use client'

import { useState } from 'react'

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      
      // 1. 向後端請求 OAuth URL (這會建立 session)
      const response = await fetch(
        'https://admin.timsfantasyworld.com/auth/customer/google',
        {
          method: 'GET',
          credentials: 'include', // ⭐️ 重要!建立並保存 session
          headers: {
            'Accept': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.location) {
        throw new Error('No OAuth URL received')
      }
      
      // 2. 重定向到 Google (保持同一個 session)
      window.location.href = data.location
      
    } catch (error) {
      console.error('Google login failed:', error)
      setIsLoading(false)
      alert('Google 登入失敗,請稍後再試')
    }
  }

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          連接 Google...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            {/* Google Icon SVG */}
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          使用 Google 登入
        </>
      )}
    </button>
  )
}
```

### 使用範例

```typescript
// app/[countryCode]/account/login/page.tsx
import { GoogleLoginButton } from '@/components/GoogleLoginButton'

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">登入</h1>
      
      {/* 電子郵件登入表單 */}
      <EmailLoginForm />
      
      {/* 分隔線 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">或</span>
        </div>
      </div>
      
      {/* Google 登入 */}
      <GoogleLoginButton />
    </div>
  )
}
```

---

## 測試流程

### 🧪 本地測試步驟

#### 1. 啟動開發伺服器

```bash
npm run dev
# 或
yarn dev
```

#### 2. 打開瀏覽器

1. 前往登入頁面: `http://localhost:3000/tw/account/login`
2. 打開 **DevTools** (按 F12)
3. 切換到 **Console** 和 **Network** tab

#### 3. 測試登入

點擊「使用 Google 登入」按鈕

**預期行為** (按順序):

```
1. 瀏覽器跳轉到: https://admin.timsfantasyworld.com/auth/customer/google
   ↓
2. 立即重定向到 Google 授權頁面 (accounts.google.com)
   ↓
3. 選擇/授權 Google 帳號
   ↓
4. 回到: https://timsfantasyworld.com/tw/auth/google/callback?success=true
   ↓
5. 顯示「登入成功!」
   ↓
6. 自動跳轉到會員中心: /tw/account
```

#### 4. 驗證登入狀態

在 Console 中執行:

```javascript
// 方法 1: 使用 SDK
const session = await sdk.auth.getSession()
console.log('當前用戶:', session)

// 方法 2: 檢查 Cookie
document.cookie
```

**成功的話會看到**:

```javascript
{
  customer: {
    id: "cus_01xxxxx",
    email: "user@gmail.com",
    first_name: "User",
    last_name: "Name",
    metadata: {
      auth_provider: "google"
    }
  }
}
```

#### 5. 檢查 Cookie

**DevTools → Application → Cookies → `https://timsfantasyworld.com`**

應該看到:
- Cookie 名稱: `connect.sid`
- Domain: `.timsfantasyworld.com`
- HttpOnly: ✅
- Secure: ✅
- SameSite: `Lax`

---

## 常見問題

### ❓ Q1: 登入後 `sdk.auth.getSession()` 返回 null

**原因**: Cookie 沒有正確傳遞

**解決方法**:

```typescript
// 1. 確認 SDK 配置有 credentials: 'include'
export const sdk = new Medusa({
  baseUrl: "https://admin.timsfantasyworld.com",
  fetchConfig: { 
    credentials: 'include'  // ⭐ 必須!
  },
})

// 2. 確認所有 API 請求都帶上 credentials
fetch('https://admin.timsfantasyworld.com/store/...', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### ❓ Q2: 授權後顯示 404

**原因**: 沒有創建 callback 頁面

**解決方法**: 創建 `app/[countryCode]/auth/google/callback/page.tsx` (見上方完整代碼)

### ❓ Q3: Console 顯示 CORS 錯誤

**原因**: 後端 CORS 配置問題

**檢查**: 通知後端工程師確認 `.env.production`:

```bash
AUTH_CORS=https://timsfantasyworld.com,https://admin.timsfantasyworld.com
STORE_CORS=https://timsfantasyworld.com
COOKIE_DOMAIN=.timsfantasyworld.com
```

### ❓ Q4: 一直停在「處理中...」

**可能原因**:
1. 後端沒有重定向回前端
2. URL 參數沒有正確傳遞

**Debug 方法**:

```typescript
// 在 callback 頁面加入 debug log
useEffect(() => {
  console.log('Callback URL:', window.location.href)
  console.log('Search params:', Object.fromEntries(searchParams.entries()))
}, [])
```

### ❓ Q5: Google 授權後顯示「redirect_uri_mismatch」錯誤

**原因**: Google Cloud Console 設定問題

**解決方法**: 通知後端工程師到 Google Cloud Console 確認:

授權重新導向 URI 必須包含:
```
https://admin.timsfantasyworld.com/auth/customer/google/callback
```

---

## 測試檢查清單

部署到 Production 前,請確認:

- [ ] Google 登入按鈕改為直接導向後端
- [ ] Callback 頁面已創建並部署
- [ ] SDK 配置包含 `credentials: 'include'`
- [ ] 本地測試登入流程成功
- [ ] 登入後可以獲取 session (`sdk.auth.getSession()`)
- [ ] Cookie 正確設定 (`connect.sid`)
- [ ] 登入後可以存取需要認證的頁面
- [ ] 登出功能正常運作

---

## 後端 API 參考

### 檢查登入狀態

```typescript
const session = await sdk.auth.getSession()
// 返回: { customer: {...} } 或 null
```

### 登出

```typescript
await sdk.auth.deleteSession("customer")
// 清除 session cookie
```

### 獲取當前用戶資料

```typescript
const customer = await sdk.store.customer.retrieve()
// 返回完整的 customer 資料
```

---

## 需要後端支援?

如果遇到以下問題,請聯繫後端工程師:

1. ❌ CORS 錯誤
2. ❌ Cookie 沒有設定
3. ❌ 後端返回 500 錯誤
4. ❌ redirect_uri_mismatch 錯誤
5. ❌ 登入後 database 沒有建立用戶

**後端 Debug 指令**:

```bash
# 檢查後端日誌
gcloud compute ssh tims-web --zone=asia-east1-c \
  --command="pm2 logs medusa-backend --lines 50"

# 測試 OAuth endpoint
curl -i 'https://admin.timsfantasyworld.com/auth/customer/google'
```

---

## 總結

### ✅ 你需要做的事 (總共 3 件)

1. **修改登入按鈕** → 改成 `window.location.href = '後端URL'`
2. **創建 Callback 頁面** → 複製上面的代碼
3. **測試** → 確認登入流程正常

### 🎉 完成後的效果

- 用戶點擊 Google 登入 → 自動完成授權 → 回到網站已登入
- Session 自動保持 (使用 HttpOnly cookie,更安全)
- 前端不需要處理複雜的 OAuth token 交換
- 跨子域名登入狀態共享 (`.timsfantasyworld.com`)

---

**文檔版本**: 1.0  
**最後更新**: 2025-11-02  
**後端狀態**: ✅ 已部署並測試通過  
**預計前端工作時間**: 10-15 分鐘
