# 前端整合說明 — Google OAuth（給 Frontend）

目的：提供前端工程師完整、可操作的步驟與檢查清單，讓 Google OAuth 能與後端（Medusa v2）順利串接並完成登入/註冊流程。

重要前提
- 前端 domain: `https://timsfantasyworld.com`
- 後端 domain: `https://admin.timsfantasyworld.com`
- Google OAuth callback 在後端：`https://admin.timsfantasyworld.com/auth/customer/google/callback`
- 確認後端已部署並包含已修正的 Google verify callback（使用 `query.graph()` 與 `createCustomersWorkflow`）

快速流程（高階）
1. 使用者在前端點擊「使用 Google 登入」。
2. 前端導到後端的 `/auth/customer/google`（或直接觸發 SDK 去拿 redirect URL），由後端建立 Google 授權 URL 並重導到 Google。 
3. Google 進行授權後，Google 會先把使用者導到後端 callback（`/auth/customer/google/callback`），後端會完成 token 交換、建立/查詢 customer，然後回應或設定 httpOnly cookie（JWT）。
4. Google 也會把使用者導回前端 callback 頁（例如：`/tw/auth/google/callback`），前端接收 URL 的 `code` 與 `state`，並呼叫 Medusa SDK 的 `auth.callback()`（或直接請求後端 callback endpoint）完成最後步驟，之後頁面重導到會員中心。

前端詳細步驟（建議實作）

1) SDK 與 fetch 設定（必要）
- 確保 Medusa SDK baseUrl 指向後端 `https://admin.timsfantasyworld.com`。
- 請求需要帶上 credentials：

```typescript
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: "https://admin.timsfantasyworld.com",
  auth: { type: 'session' },
  fetchConfig: { credentials: 'include' },
})
```

2) Google 登入按鈕：直接導向後端的授權入口（最簡單也最可靠）

```ts
// 最簡單方式，讓瀏覽器導向後端，後端會 redirect 到 Google
window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
```

或使用 SDK 取得 URL：

```ts
// 若 SDK 提供 helper，可以取得 url 再 window.location.href = url
```

3) 前端 callback 頁面（Next.js 範例）
- 前端需要有一個 callback page 接收 Google 回傳的 `code` 和 `state`，再呼叫 SDK 的 callback 完成登入。
- 範例（React / Next.js client component）：

```tsx
'use client'
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { sdk } from '@/lib/config' // 上面建立的 SDK

export default function GoogleCallbackPage({ params }: { params: { countryCode: string } }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { countryCode } = params

  useEffect(() => {
    (async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        if (!code || !state) throw new Error('Missing code/state')

        console.log('Calling sdk.auth.callback to complete Google OAuth...')
        // Medusa SDK 會向後端完成 callback 驗證並且（若後端設定）由後端回傳 Set-Cookie
        const res = await sdk.auth.callback('customer', 'google', { query: { code, state } })
        console.log('callback response', res)

        // 若後端用 httpOnly cookie 設定 JWT，前端不用手動設定 cookie
        // 直接跳轉到 account 頁面
        router.push(`/${countryCode}/account`)
      } catch (err) {
        console.error('Google callback error', err)
        router.push(`/${countryCode}/account?error=oauth_failed`)
      }
    })()
  }, [searchParams, router, countryCode])

  return <div>正在完成 Google 登入，請稍候...</div>
}
```

4) Cookie 與跨子域注意事項
- 後端會使用 httpOnly 的 `_medusa_jwt` Cookie（由後端透過 Set-Cookie 設定），前端無法透過 JS 讀取 httpOnly cookie。
- 因為前後端為同一主域名 (`timsfantasyworld.com`，分別為 `admin.timsfantasyworld.com` 與 `timsfantasyworld.com`)，後端應設定 Cookie 的 `domain` 為 `.timsfantasyworld.com`，以便前端子域可共享：

```
Set-Cookie: _medusa_jwt=...; Domain=.timsfantasyworld.com; Path=/; HttpOnly; Secure; SameSite=Lax
```

- 前端請確保所有向後端的請求都帶上 credentials（`credentials: 'include'`）以讓瀏覽器帶上 Cookie。

5) CORS
- 確認後端 `medusa-config.ts` 的 `storeCors` / `authCors` 包含 `https://timsfantasyworld.com`。
- 前端請求（例如 `sdk.auth.callback()`）會帶上 credentials，瀏覽器會檢查 CORS 的 `Access-Control-Allow-Credentials` 與 `Access-Control-Allow-Origin`。

調試與驗證清單（前端測試時）

1. Network 檢查
- 在開發者工具 → Network，檢查下列請求：
  - GET `https://admin.timsfantasyworld.com/auth/customer/google`（會被重導到 Google）
  - / 或 SDK 執行時：請檢查呼叫 `auth/customer/google/callback` 或 `sdk.auth.callback()` 產生的請求
- 檢查 callback 的 response headers 是否包含 `Set-Cookie: _medusa_jwt=...`

2. Cookie 檢查
- 開發者工具 → Application → Cookies，找 `timsfantasyworld.com` 下是否有 `_medusa_jwt`（注意：如果後端使用 `HttpOnly`，前端無法透過 JS 看到，需由後端提供日誌驗證）
- 檢查 cookie attributes：Domain 應為 `.timsfantasyworld.com`，SameSite 建議 `Lax`，Secure `true`（production）

3. 前端 Console 日誌
- callback page 應輸出：
  - `Calling sdk.auth.callback to complete Google OAuth...`
  - `callback response`（印出 SDK 回傳的內容）

4. 後端日誌（請求後端工程師提供）
- 搜尋 `=== Google OAuth Callback ===` 顯示 profile
- 是否有 `➕ Google Auth: Creating new customer for ...` 或 `✅ Google Auth: Customer ... already exists` 訊息

5. 若登入完成但仍無法顯示用戶資料
- 確保會員中心頁面在載入用戶資料時，向後端請求時也帶上 credentials

常見問題與建議解法

- 問題：前端收到 code 但 `sdk.auth.callback()` 失敗
  - 檢查 Network：callback 的請求是否被送出？是否有 CORS 錯誤？
  - 檢查後端是否收到了該請求（後端日誌）

- 問題：後端日誌顯示已建立 customer 但前端沒有登入
  - 檢查 Set-Cookie 是否存在與正確（domain、samesite、secure）
  - 確保前端請求時帶 credentials

- 問題：Cookie 在 local 測試時看不到
  - local 開發可能 domain 不同，建議以 staging 或 production domain 做整體測試

如果需要提供給後端的 debug 資訊（請在測試時截圖或貼上）
- 前端 Network 請求（含 Request/Response headers）
- 前端 Console 的完整日誌（含錯誤堆疊）
- 使用測試的 Google 帳號 email（後端用於資料庫查詢）與測試時間

---

聯絡與下一步
- 完成上述整合後，執行完整的 E2E 測試（用新帳號測試註冊、用既有帳號測試登入）
- 若失敗，請把前端 Network 與 Console 的截圖/文字交給後端工程師，後端會回傳日誌

檔案位置：`docs/FRONTEND_GOOGLE_OAUTH.md`（已建立）

如果你要，我可以：
- 把範例 callback 頁直接放進前端 repo（需要你提供前端 repo 路徑或 PR 權限）
- 或把一份簡短 checklist 直接貼到 Slack/Email 上，方便前端 QA 使用
