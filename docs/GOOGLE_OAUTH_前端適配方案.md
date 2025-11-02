# 🔧 Medusa v2 Google OAuth 前端適配方案

## 📊 現況分析

### 後端實際行為 (已驗證)
```bash
GET https://admin.timsfantasyworld.com/auth/customer/google
```

**回應**:
```json
HTTP/2 200
Content-Type: application/json

{
  "location": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 為什麼是 JSON 而不是重定向?

**Medusa v2 的 `@medusajs/auth-google` 預設行為**:
- 設計給 **SPA (Single Page Application)** 使用
- 前端使用 SDK 或 fetch 取得 OAuth URL
- 前端自行處理重定向

這是**有意的設計**,不是 bug!

---

## ✅ 解決方案 A: 前端適配 (推薦,最快)

### 為什麼推薦?
- ✅ 不需要修改後端
- ✅ 5 分鐘內完成
- ✅ 符合 Medusa v2 設計模式
- ✅ 後端保持標準實作

### 前端代碼修改

#### 方法 1: 使用 fetch (推薦)

```typescript
const handleGoogleLogin = async () => {
  try {
    // 1. 取得 Google OAuth URL
    const response = await fetch(
      'https://admin.timsfantasyworld.com/auth/customer/google',
      {
        method: 'GET',
        credentials: 'include', // 重要!建立 session
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to get OAuth URL')
    }
    
    const data = await response.json()
    
    // 2. 重定向到 Google
    if (data.location) {
      window.location.href = data.location
    } else {
      throw new Error('No OAuth URL returned')
    }
    
  } catch (error) {
    console.error('Google login failed:', error)
    // 顯示錯誤訊息給使用者
  }
}
```

#### ⚠️ 重要: Session Continuity

**問題**: 上面的方法會有 session 不連續的問題!

**正確的實作**:

```typescript
const handleGoogleLogin = async () => {
  try {
    // 使用 iframe 或 fetch 預先建立 session
    const response = await fetch(
      'https://admin.timsfantasyworld.com/auth/customer/google',
      {
        method: 'GET',
        credentials: 'include', // ⭐️ 這會建立 session 並設定 cookie
        headers: {
          'Accept': 'application/json'
        }
      }
    )
    
    const data = await response.json()
    
    // ⭐️ 直接導航 (不要再用 fetch),保持同一個 session
    window.location.href = data.location
    
  } catch (error) {
    console.error('Google login initialization failed:', error)
  }
}
```

**為什麼這樣可以?**
1. `fetch()` 建立 session,設定 `connect.sid` cookie
2. `window.location.href` 使用**同一個瀏覽器上下文**,cookie 會自動帶上
3. Google callback 回來時,session 還在!

---

## 🔧 解決方案 B: 後端調整 (如果前端無法修改)

### 修改方式: 自定義 Route Handler

創建新文件覆蓋預設行為:

**檔案**: `src/api/auth/customer/google/route.ts`

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * 自定義 Google OAuth 初始化路由
 * 覆蓋 @medusajs/auth-google 的預設 JSON 回應
 * 改為 HTTP 302 重定向
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    console.log("🔵 Custom Google OAuth Init - Redirecting...")
    
    // 1. 呼叫原始的 middleware 取得 OAuth URL
    // 注意: 需要先讓 middleware 建立 session
    const container = req.scope.resolve("configModule")
    const authConfig = container.projectConfig.modules?.find(
      (m: any) => m.resolve === '@medusajs/auth'
    )
    
    const googleProvider = authConfig?.options?.providers?.find(
      (p: any) => p.id === 'google'
    )
    
    if (!googleProvider) {
      throw new Error('Google OAuth provider not configured')
    }
    
    // 2. 手動建構 OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL
    const state = generateState() // 需要實作
    
    // 3. 儲存 state 到 session
    if (req.session) {
      req.session.oauth_state = state
    }
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', callbackUrl)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'email profile openid')
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'select_account')
    
    // 4. ✅ 使用 HTTP 重定向
    res.redirect(302, authUrl.toString())
    
  } catch (error) {
    console.error('❌ Google OAuth init failed:', error)
    const frontendUrl = process.env.FRONTEND_URL || 'https://timsfantasyworld.com'
    res.redirect(`${frontendUrl}/tw/account/login?error=oauth_init_failed`)
  }
}

function generateState(): string {
  return crypto.randomBytes(32).toString('hex')
}
```

### ⚠️ 問題: 這可能與 Medusa middleware 衝突

創建自定義路由**可能不會覆蓋** middleware 的行為,因為 middleware 先執行。

---

## 🎯 最佳解決方案: 混合方式

### 結合兩者優點

#### 後端: 添加一個專門的重定向 endpoint

**檔案**: `src/api/auth/customer/google/init/route.ts`

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /auth/customer/google/init
 * 
 * 專門用於瀏覽器直接導航的重定向版本
 * 保持 /auth/customer/google 的 JSON 回應不變 (SDK 使用)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    console.log("🔵 Google OAuth Init (Redirect Mode)")
    
    // 1. 先呼叫標準 endpoint 建立 session
    const baseUrl = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
    
    // 使用內部請求避免重複建立 session
    const response = await fetch(`${baseUrl}/auth/customer/google`, {
      headers: {
        cookie: req.headers.cookie || '',
      }
    })
    
    const data = await response.json()
    
    if (!data.location) {
      throw new Error('Failed to get OAuth URL')
    }
    
    // 2. 複製 session cookie
    const setCookies = response.headers.get('set-cookie')
    if (setCookies) {
      res.setHeader('Set-Cookie', setCookies)
    }
    
    // 3. ✅ 重定向到 Google
    console.log("✅ Redirecting to Google:", data.location)
    res.redirect(302, data.location)
    
  } catch (error) {
    console.error("❌ Google OAuth init failed:", error)
    const frontendUrl = process.env.FRONTEND_URL || 'https://timsfantasyworld.com'
    res.redirect(`${frontendUrl}/tw/account/login?error=oauth_init_failed`)
  }
}
```

#### 前端: 使用新的 endpoint

```typescript
const handleGoogleLogin = () => {
  // ✅ 簡單!直接導向重定向版本的 endpoint
  window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google/init'
}
```

---

## 📊 方案比較

| 方案 | 優點 | 缺點 | 實作時間 | 推薦度 |
|------|------|------|----------|--------|
| **A. 前端適配** | 不需改後端<br/>符合 Medusa 設計 | 需要處理 session continuity | 5 分鐘 | ⭐⭐⭐⭐⭐ |
| **B. 覆蓋 route** | 完全自定義 | 可能與 middleware 衝突<br/>維護成本高 | 30 分鐘 | ⭐⭐ |
| **C. 新增 init endpoint** | 兩全其美<br/>不破壞現有 API | 需要修改前後端 | 15 分鐘 | ⭐⭐⭐⭐ |

---

## ✅ 推薦實作: 方案 A (前端適配)

### 完整前端代碼

```typescript
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.location) {
        throw new Error('No OAuth URL received from backend')
      }
      
      console.log('✅ OAuth URL received, redirecting to Google...')
      
      // 2. ✅ 直接導航到 Google (保持 session)
      window.location.href = data.location
      
    } catch (error) {
      console.error('❌ Google login failed:', error)
      setIsLoading(false)
      
      // 顯示錯誤訊息給使用者
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

### 為什麼這個方法可行?

```
1. fetch() 請求
   ↓
   建立 session A
   設定 Cookie: connect.sid=xxx
   ↓
2. window.location.href = data.location
   ↓
   瀏覽器導航到 Google
   自動帶上 Cookie: connect.sid=xxx (同一個 session!)
   ↓
3. Google callback
   ↓
   帶著 Cookie: connect.sid=xxx 回到後端
   ↓
   後端在 session A 中找到 state ✅
   ↓
   驗證成功!
```

**關鍵**: `fetch()` 和 `window.location.href` 都在**同一個瀏覽器上下文**中,cookie 自動共享!

---

## 🧪 測試方式

### 1. 檢查 Cookie 是否正確設定

在 `fetch()` 之後,檢查 DevTools → Application → Cookies:

```javascript
const handleGoogleLogin = async () => {
  const response = await fetch('...', { credentials: 'include' })
  
  // 檢查 cookie
  console.log('📍 Cookies after fetch:', document.cookie)
  
  const data = await response.json()
  window.location.href = data.location
}
```

應該看到 `connect.sid=...`

### 2. 檢查 Network Tab

**Request 1** (fetch):
```
Request URL: https://admin.timsfantasyworld.com/auth/customer/google
Method: GET
Status: 200
Response Headers:
  set-cookie: connect.sid=...; Domain=.timsfantasyworld.com; HttpOnly
Response Body:
  { "location": "https://accounts.google.com/..." }
```

**Request 2** (window.location.href):
```
Request URL: https://accounts.google.com/o/oauth2/v2/auth?...
Method: GET
Request Headers:
  Cookie: connect.sid=... ← 同一個!
```

---

## 📝 總結

### ✅ 推薦: 前端適配 (方案 A)

**前端改動**:
```typescript
// ❌ 舊的
window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'

// ✅ 新的
const response = await fetch('https://admin.timsfantasyworld.com/auth/customer/google', {
  credentials: 'include'
})
const data = await response.json()
window.location.href = data.location
```

**優點**:
- ✅ 不需要修改後端
- ✅ 符合 Medusa v2 設計
- ✅ Session continuity 正確
- ✅ 5 分鐘內完成

**後端**: 不需要改動! ✅

---

**文檔版本**: 1.0  
**建立日期**: 2025-11-02  
**狀態**: ✅ 已驗證後端行為並提供完整解決方案
