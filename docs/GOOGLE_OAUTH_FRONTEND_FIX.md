# Google OAuth 前端修復指南

**問題現況**: 前端收到 callback,但 SDK 呼叫失敗 (401 Unauthorized)

**根本原因**: OAuth flow 混亂 - Google 重定向到前端,前端再用 SDK 呼叫後端

---

## 正確的 OAuth Flow

### 方案 A: Medusa 標準流程 (推薦)

讓 Google **直接重定向到後端**,不經過前端 callback 頁面。

#### 前端修改

**檔案**: 前端登入按鈕 (例如 `LoginForm.tsx` 或類似)

**修改前**:
```typescript
// ❌ 錯誤: 使用 SDK.auth.register() 會讓 Google 重定向到前端
const handleGoogleLogin = async () => {
  const result = await sdk.auth.register("customer", "google")
  // ...
}
```

**修改後**:
```typescript
// ✅ 正確: 直接重定向到後端,讓 Medusa 處理整個 flow
const handleGoogleLogin = () => {
  window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
}
```

#### 前端 Callback 頁面修改

**檔案**: `app/[countryCode]/auth/google/callback/page.tsx`

**修改後**:
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function GoogleCallbackPage({ 
  params 
}: { 
  params: { countryCode: string } 
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { countryCode } = params

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'true') {
      console.log('✅ Google 登入成功,重定向到會員中心')
      // Cookie 已由後端設定,直接重定向
      router.push(`/${countryCode}/account`)
    } else if (error) {
      console.error('❌ Google 登入失敗:', error)
      router.push(`/${countryCode}/account?error=google_login_failed`)
    } else {
      // 沒有參數,可能是直接訪問此頁面
      console.log('⚠️ 無效的 callback,重定向回登入頁')
      router.push(`/${countryCode}/account`)
    }
  }, [searchParams, router, countryCode])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">正在完成 Google 登入...</p>
      </div>
    </div>
  )
}
```

---

## 完整 OAuth Flow

```
1. 使用者點擊「Google 登入」按鈕
   window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
   ↓

2. 瀏覽器導向後端
   GET https://admin.timsfantasyworld.com/auth/customer/google
   ↓

3. 後端產生 Google OAuth URL 並重定向
   302 → https://accounts.google.com/o/oauth2/v2/auth?
         client_id=...
         &redirect_uri=https://admin.timsfantasyworld.com/auth/customer/google/callback
         &response_type=code
         &scope=openid email profile
   ↓

4. 使用者在 Google 授權
   ↓

5. Google 重定向回「後端」 ⭐
   GET https://admin.timsfantasyworld.com/auth/customer/google/callback?
       code=xxx&state=xxx
   ↓

6. 後端處理 callback (src/api/auth/customer/google/callback/route.ts)
   - 用 code 交換 access_token
   - 取得 Google 使用者資訊
   - 建立/查找 customer
   - 產生 JWT token
   - 設定 _medusa_jwt cookie (httpOnly, domain=.timsfantasyworld.com)
   ↓

7. 後端重定向回「前端」
   302 → https://timsfantasyworld.com/tw/auth/google/callback?success=true
   (Cookie 已自動設定在 response header)
   ↓

8. 前端 callback 頁面
   - 檢查 success=true
   - 重定向到會員中心 /tw/account
   ↓

9. 會員中心頁面
   - GET https://admin.timsfantasyworld.com/store/customers/me
   - (自動攜帶 _medusa_jwt cookie)
   - 顯示使用者資料
   ↓

✅ 登入成功!
```

---

## 方案 B: 前端處理 Callback (不推薦)

如果你堅持讓前端處理 callback,需要修改後端來支援。但這會更複雜,且不符合 Medusa v2 的標準流程。

---

## Google Cloud Console 設定

**重要**: 確認 Authorized redirect URIs 是:

```
https://admin.timsfantasyworld.com/auth/customer/google/callback
```

**不是**:
```
https://timsfantasyworld.com/tw/auth/google/callback  ❌
```

---

## 快速測試

### 測試 1: 檢查後端 OAuth 入口

在瀏覽器訪問:
```
https://admin.timsfantasyworld.com/auth/customer/google
```

預期: 應該立即重定向到 Google 授權頁面

### 測試 2: 檢查環境變數

```bash
gcloud compute ssh tims-web --zone=asia-east1-c
cd ~/projects/backend
grep GOOGLE_CALLBACK_URL .env
```

預期輸出:
```
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
```

### 測試 3: 檢查 Google Cloud Console

訪問: https://console.cloud.google.com/apis/credentials

確認 Authorized redirect URIs 包含:
```
https://admin.timsfantasyworld.com/auth/customer/google/callback
```

---

## 當前問題診斷

你看到的錯誤:
```
POST /auth/session 401 Unauthorized
```

**原因**:
1. 前端收到 callback (帶 code 和 state)
2. 前端呼叫 `sdk.auth.callback("customer", "google", { code, state })`
3. SDK 向後端發送 POST /auth/session
4. 但後端沒有先處理 Google callback,沒有建立 session
5. 所以返回 401

**解決**: 讓 Google 直接重定向到後端 (方案 A)

---

## 需要修改的檔案

### 前端

1. **登入按鈕** (例如 `app/[countryCode]/account/components/LoginForm.tsx`)
   ```typescript
   const handleGoogleLogin = () => {
     window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
   }
   ```

2. **Callback 頁面** (`app/[countryCode]/auth/google/callback/page.tsx`)
   - 移除 SDK 呼叫
   - 只處理重定向邏輯

### 後端

- ✅ 已完成 (callback route 已建立)

### Google Cloud Console

- 確認 Authorized redirect URIs 正確

---

## 驗證步驟

1. 修改前端代碼
2. 重新部署前端
3. 清除瀏覽器 cookie
4. 測試 Google 登入
5. 監控後端日誌:
   ```bash
   pm2 logs medusa-backend --lines 0
   ```

預期看到:
```
=== /auth/customer/google/callback ===
Query params: { code: '...', state: '...' }
✅ Auth context found
🔐 JWT token generated
🍪 Setting cookie...
✅ Cookie set successfully
📤 Redirecting to: https://timsfantasyworld.com/tw/auth/google/callback?success=true
```

---

建立日期: 2025-11-02
