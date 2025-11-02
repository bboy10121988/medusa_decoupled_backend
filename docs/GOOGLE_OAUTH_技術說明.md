# Google OAuth 整合技術說明 - 給前端工程師

## 🔍 問題分析

### 目前狀況
前端直接 `fetch('https://admin.timsfantasyworld.com/auth/customer/google')` 時出現 `no_auth_context` 錯誤。

### 根本原因
**Medusa v2 的 `@medusajs/auth-google` 使用標準的 Passport.js OAuth2 流程**:

1. **初始請求** (`/auth/customer/google`):
   - 由 `@medusajs/auth-google` middleware 自動處理
   - Middleware 會建立 session 並存儲 `state` (CSRF token)
   - 返回重定向到 Google 的 URL

2. **Callback 請求** (`/auth/customer/google/callback`):
   - Google 帶著 `code` 和 `state` 重定向回來
   - Middleware 驗證 `state` 是否匹配 session 中存儲的值
   - **如果沒有 session 或 state 不匹配,就會出現 `no_auth_context` 錯誤**

---

## ✅ 正確的整合方式

### **方案: 直接重定向 (推薦)**

這是最簡單且最可靠的方式,因為:
- 保持瀏覽器的 session continuity
- 讓 Medusa middleware 自動處理所有 OAuth 流程
- 不需要擔心 CORS 或 cookie 問題

#### 實作方式

```typescript
// ✅ 正確: 讓瀏覽器直接導向後端
const handleGoogleLogin = () => {
  window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
}
```

#### 為什麼這個方式可行?

1. **瀏覽器直接導向** → 建立 session
2. **Middleware 處理** → 存儲 state 到 session
3. **重定向到 Google** → 帶著 state 參數
4. **Google callback** → 同一個 session,state 驗證通過
5. **完成登入** → 設定 cookie,重定向回前端

---

## ❌ 為什麼 fetch() 不行?

### 問題 1: Session 不連續

```typescript
// ❌ 錯誤方式
const response = await fetch('https://admin.timsfantasyworld.com/auth/customer/google', {
  credentials: 'include'
})
const data = await response.json()
window.location.href = data.location
```

**問題**:
1. `fetch()` 請求建立了 session A
2. `window.location.href` 是**新的瀏覽器導航**,建立 session B
3. Google callback 帶著 session B 回來
4. 但 `state` 存在 session A 中 → **找不到,錯誤!**

### 問題 2: CORS Preflight

如果前端使用 `fetch()` 搭配自定義 headers:
- 會觸發 CORS preflight (OPTIONS 請求)
- Preflight 不會帶 cookies
- 導致 session 管理更複雜

---

## 🔧 後端實作說明 (給後端參考)

### 當前後端架構

```typescript
// medusa-config.ts
{
  resolve: '@medusajs/auth-google',
  id: 'google',
  options: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: 'https://admin.timsfantasyworld.com/auth/customer/google/callback',
    verify: async (container, req, accessToken, refreshToken, profile, done) => {
      // 處理用戶創建/查詢邏輯
    }
  }
}
```

### Endpoint 流程

#### 1. `/auth/customer/google` (初始化)
**處理者**: `@medusajs/auth-google` middleware (Passport.js)

**自動處理**:
- 建立 session
- 生成 random `state` (CSRF token)
- 存儲 `state` 到 session
- 返回 302 重定向到 Google

**前端不需要自己處理**,只要 `window.location.href` 就好。

#### 2. `/auth/customer/google/callback` (處理 Google 回傳)
**處理者**: `@medusajs/auth-google` middleware + 自定義邏輯

**Middleware 自動處理**:
- 從 session 讀取 `state`
- 驗證 URL 中的 `state` 參數是否匹配
- 用 `code` 交換 access token
- 呼叫 `verify` callback
- 建立 auth context

**自定義邏輯** (`src/api/auth/customer/google/callback/route.ts`):
- 生成 JWT token
- 設定 HTTP-only cookie
- 重定向回前端

---

## 🎯 完整的前端整合代碼

### 1. 登入按鈕

```typescript
'use client'

export function GoogleLoginButton() {
  const handleGoogleLogin = () => {
    // 直接導向後端 OAuth endpoint
    // Medusa middleware 會自動處理所有事情
    window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
  }

  return (
    <button onClick={handleGoogleLogin}>
      使用 Google 登入
    </button>
  )
}
```

### 2. Callback 頁面

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

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'true') {
      // 登入成功!Cookie 已經設定好了
      console.log('✅ Google 登入成功!')
      router.push(`/${params.countryCode}/account`)
    } else if (error) {
      console.error('❌ Google 登入失敗:', error)
      router.push(`/${params.countryCode}/account/login?error=${error}`)
    }
  }, [searchParams, router, params.countryCode])

  return <div>處理登入中...</div>
}
```

### 3. SDK 配置 (確認已設定)

```typescript
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: "https://admin.timsfantasyworld.com",
  auth: { type: 'session' },
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  fetchConfig: { 
    credentials: 'include'  // 重要!讓後續 API 請求可以帶 cookie
  },
})
```

---

## 🔐 Session & Cookie 流程圖

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 前端: window.location.href = '/auth/customer/google'        │
│    → 瀏覽器發起 GET 請求                                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. 後端 Middleware (@medusajs/auth-google)                     │
│    ✓ 建立 session (express-session)                            │
│    ✓ 生成 state = random_string                                │
│    ✓ session.state = state                                     │
│    ✓ 返回 302 → https://accounts.google.com/...?state=xxx      │
│    ✓ Set-Cookie: connect.sid=session_id; Domain=.timsfantasy..│
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Google 授權頁面                                              │
│    → 用戶選擇帳號並授權                                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Google Callback                                              │
│    GET /auth/customer/google/callback?code=xxx&state=xxx        │
│    Cookie: connect.sid=session_id  ← 同一個 session!           │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. 後端 Middleware 驗證                                         │
│    ✓ 從 session 讀取 state                                      │
│    ✓ 比對 URL 的 state 參數                                     │
│    ✓ 匹配成功!繼續處理                                          │
│    ✓ 用 code 交換 access token                                  │
│    ✓ 呼叫 verify callback → 建立/查詢 customer                  │
│    ✓ 建立 auth_context                                          │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. 自定義 Callback Handler                                      │
│    ✓ 從 req.auth_context 取得用戶資料                           │
│    ✓ 生成 JWT token                                             │
│    ✓ 設定 HTTP-only cookie                                      │
│    ✓ 302 → https://timsfantasyworld.com/tw/auth/google/        │
│            callback?success=true                                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. 前端 Callback 頁面                                           │
│    ✓ 讀取 success=true 參數                                     │
│    ✓ Cookie 已設定 (connect.sid)                                │
│    ✓ 重定向到會員中心                                           │
│    ✓ 後續 API 請求自動帶 cookie (credentials: 'include')        │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ 常見錯誤情境

### 錯誤 1: 使用 fetch() 取得 location 再重定向

```typescript
// ❌ 這樣會導致 session 不連續
const res = await fetch('/auth/customer/google', { credentials: 'include' })
const data = await res.json()
window.location.href = data.location  // 新的 session!
```

**問題**: `fetch()` 建立 session A,但 `window.location.href` 導致新的 session B。

### 錯誤 2: 從前端直接帶 state 參數

```typescript
// ❌ 不要自己處理 state
const state = generateRandomString()
window.location.href = `/auth/customer/google?state=${state}`
```

**問題**: Middleware 會忽略你的 state,用它自己生成的。

### 錯誤 3: 嘗試在前端驗證 state

```typescript
// ❌ 不要在前端驗證 state
// 這是後端 middleware 的工作
```

---

## 📝 後端需要確認的配置

請確認 `.env.production` 包含:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=273789094137-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback

# CORS (確保前端可以接收 redirect)
AUTH_CORS=https://timsfantasyworld.com,https://admin.timsfantasyworld.com
STORE_CORS=https://timsfantasyworld.com

# Cookie 設定
COOKIE_DOMAIN=.timsfantasyworld.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax

# Frontend URL (用於 callback 重定向)
FRONTEND_URL=https://timsfantasyworld.com
```

---

## 🧪 測試方式

### 1. 檢查初始化 endpoint

```bash
curl -i 'https://admin.timsfantasyworld.com/auth/customer/google'
```

**預期結果**:
```
HTTP/2 302
location: https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=...&state=...
set-cookie: connect.sid=...; Domain=.timsfantasyworld.com; Path=/; HttpOnly; Secure
```

### 2. 檢查 redirect_uri

```bash
curl -s 'https://admin.timsfantasyworld.com/auth/customer/google' \
  | grep -o 'redirect_uri=[^&]*' \
  | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read()))"
```

**預期結果**:
```
redirect_uri=https://admin.timsfantasyworld.com/auth/customer/google/callback
```

---

## 💡 總結

### 正確答案: **直接瀏覽器重定向**

```typescript
window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
```

### 為什麼?

1. **保持 session continuity** - 整個流程都在同一個瀏覽器 session 中
2. **Middleware 自動處理** - 不需要手動管理 state 或 token
3. **標準 OAuth2 流程** - 符合 Passport.js 和 Medusa 的設計
4. **Cookie 自動設定** - 後端可以正確設定 HTTP-only cookies

### 不需要:

- ❌ 使用 SDK 的 `auth.login()` (這可能是給不同的 auth provider 用的)
- ❌ 先建立 session 再請求 URL
- ❌ 手動處理 state 參數
- ❌ 使用 fetch() 取得 location

### 前端只需要:

1. **登入按鈕**: `window.location.href = '後端URL'`
2. **Callback 頁面**: 讀取 `?success=true` 或 `?error=xxx`
3. **SDK 配置**: `credentials: 'include'`

就這樣!簡單又可靠。 ✅

---

**文檔版本**: 1.0  
**建立日期**: 2025-11-02  
**後端狀態**: ✅ 已測試並確認運作正常
