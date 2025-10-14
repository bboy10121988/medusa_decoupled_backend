# 前端密碼重設頁面實現指南

## 概述

根據後端的密碼重設通知設定，前端需要實現對應的密碼重設頁面來處理用戶的密碼重設請求。

## 客戶密碼重設頁面

### 路由結構
```
/reset-password?token={token}&email={email}
```

### 頁面範例 (Next.js)

```tsx
// src/app/(main)/reset-password/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { sdk } from "@/lib/config"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  useEffect(() => {
    if (!token || !email) {
      setError("無效的重設連結")
    }
  }, [token, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !email) {
      setError("無效的重設連結")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("密碼不匹配")
      return
    }

    if (formData.password.length < 8) {
      setError("密碼長度至少需要 8 個字元")
      return
    }

    setLoading(true)
    setError("")

    try {
      // 呼叫 Medusa API 重設密碼
      await sdk.auth.resetPassword("customer", {
        email,
        token,
        password: formData.password,
      })

      setMessage("密碼重設成功！您現在可以使用新密碼登入。")
      
      // 3 秒後重導向到登入頁面
      setTimeout(() => {
        window.location.href = "/tw/account"
      }, 3000)

    } catch (error: any) {
      console.error("密碼重設失敗:", error)
      setError(error.message || "密碼重設失敗，請重試或聯繫客服")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">無效的重設連結</h2>
            <p className="mt-2 text-gray-600">
              此連結無效或已過期，請重新申請密碼重設。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            重設密碼
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            為 {email} 設定新密碼
          </p>
        </div>

        {message && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-800">{message}</div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                新密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                確認新密碼
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "重設中..." : "重設密碼"}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/tw/account"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              返回登入頁面
            </a>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>密碼要求：至少 8 個字元，建議包含大小寫字母、數字和特殊符號</p>
        </div>
      </div>
    </div>
  )
}
```

## 管理員密碼重設

Medusa Admin 已內建密碼重設功能，通常在以下路徑：
```
{MEDUSA_BACKEND_URL}/app/reset-password?token={token}&email={email}
```

## API 測試

### 測試密碼重設郵件發送

```bash
# 測試客戶密碼重設
curl -X POST "https://admin.timsfantasyworld.com/admin/test-password-reset" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "customer@example.com",
    "actor_type": "customer"
  }'

# 測試管理員密碼重設
curl -X POST "https://admin.timsfantasyworld.com/admin/test-password-reset" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "admin@example.com",
    "actor_type": "user"
  }'
```

### 使用 Medusa Admin 觸發密碼重設

1. 前往 Medusa Admin 登入頁面
2. 點擊「忘記密碼？」
3. 輸入管理員電子郵件
4. 檢查郵箱收取重設郵件

### 使用 API 觸發客戶密碼重設

```bash
# 為客戶申請密碼重設
curl -X POST "https://admin.timsfantasyworld.com/auth/customer/emailpass/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "customer@example.com"
  }'
```

## 自定義樣式

可以根據網站設計調整密碼重設頁面的樣式，確保：

1. **響應式設計** - 在各種裝置上都能正常顯示
2. **無障礙支援** - 適當的標籤和鍵盤導航
3. **錯誤處理** - 清楚的錯誤訊息和狀態回饋
4. **安全考量** - 不在 URL 或日誌中洩漏敏感資訊
5. **用戶體驗** - 簡潔明了的流程和指示

## 整合測試

完整測試流程：

1. ✅ 設定 SendGrid 範本
2. ✅ 後端訂閱者正常運作
3. ✅ 前端密碼重設頁面能正確處理 token 和 email
4. ✅ API 呼叫成功重設密碼
5. ✅ 郵件正確發送和接收
6. ✅ 用戶能正常登入新密碼