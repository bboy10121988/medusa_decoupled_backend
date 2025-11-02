# Google OAuth 配置問題解決方案

## 問題根本原因

Medusa v2 使用 `loadEnv` 工具根據 `NODE_ENV` 載入不同的環境變數文件:

| NODE_ENV | 載入的文件 |
|----------|-----------|
| development | `.env` |
| production | `.env.production` |
| staging | `.env.staging` |
| test | `.env.test` |

## 原始問題

- 設定了 `NODE_ENV=production`
- 但只有 `.env` 文件,沒有 `.env.production`
- 導致環境變數沒有被正確載入
- `callbackUrl` 一直顯示舊的前端 URL

## 解決方案

### 1. 創建 `.env.production` 文件

在專案根目錄創建 `.env.production`,包含所有生產環境變數:

```bash
# Google OAuth 配置
GOOGLE_CLIENT_ID=273789094137-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback

# 其他必要的環境變數...
```

### 2. 使用 NODE_ENV=production 編譯

```bash
# 清除舊的編譯緩存
rm -rf .medusa node_modules/.cache

# 使用 production 環境編譯
NODE_ENV=production yarn build
```

### 3. 完全重啟 PM2

```bash
# 停止並清除 PM2
pm2 delete medusa-backend
pm2 kill

# 重新啟動
pm2 start ecosystem.config.js
```

## 驗證配置

```bash
# 測試 OAuth redirect_uri
curl -s 'https://admin.timsfantasyworld.com/auth/customer/google' \
  | jq -r '.location' \
  | grep -o 'redirect_uri=[^&]*'
```

應該看到:
```
redirect_uri=https%3A%2F%2Fadmin.timsfantasyworld.com%2Fauth%2Fcustomer%2Fgoogle%2Fcallback
```

## 關鍵知識點

1. **環境變數載入時機**: 在應用程式啟動時通過 `loadEnv()` 載入
2. **編譯時 vs 運行時**: 配置在編譯時被處理,環境變數值在編譯時讀取
3. **模塊緩存**: `@medusajs/auth-google` 會緩存初始配置,需要完全重啟才能更新
4. **文件優先級**: `.env.production` > `.env`

## 自動化部署腳本

```bash
#!/bin/bash
# deploy-oauth-fix.sh

cd ~/projects/backend

echo "🔧 部署 Google OAuth 配置修復..."
echo ""

# 確保 .env.production 存在
if [ ! -f .env.production ]; then
  echo "❌ 錯誤: .env.production 文件不存在"
  exit 1
fi

# 驗證必要的環境變數
echo "1️⃣ 驗證環境變數..."
grep -q "GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com" .env.production || {
  echo "❌ 錯誤: GOOGLE_CALLBACK_URL 配置不正確"
  exit 1
}
echo "✅ 環境變數驗證通過"
echo ""

# 清除緩存
echo "2️⃣ 清除編譯緩存..."
rm -rf .medusa node_modules/.cache
echo "✅ 緩存已清除"
echo ""

# 重新編譯
echo "3️⃣ 重新編譯 (NODE_ENV=production)..."
NODE_ENV=production yarn build
echo "✅ 編譯完成"
echo ""

# 完全重啟 PM2
echo "4️⃣ 重啟 PM2..."
pm2 delete medusa-backend 2>/dev/null || true
pm2 kill
pm2 start ecosystem.config.js
echo "✅ PM2 已重啟"
echo ""

# 等待服務啟動
echo "5️⃣ 等待服務啟動..."
sleep 8
echo ""

# 測試配置
echo "6️⃣ 測試 OAuth 配置..."
REDIRECT_URI=$(curl -s 'https://admin.timsfantasyworld.com/auth/customer/google' \
  | python3 -c "import sys, json, urllib.parse; data = json.load(sys.stdin); url = data.get('location', ''); params = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(url).query)); print(urllib.parse.unquote(params.get('redirect_uri', '')))")

echo "🔍 redirect_uri: $REDIRECT_URI"
echo ""

if [[ "$REDIRECT_URI" == *"admin.timsfantasyworld.com/auth/customer/google/callback"* ]]; then
  echo "✅ Google OAuth 配置成功!"
else
  echo "❌ 錯誤: redirect_uri 仍然不正確"
  exit 1
fi

echo ""
echo "🎉 部署完成!"
echo ""
echo "📝 請確認 Google Cloud Console 設定:"
echo "   授權重新導向 URI: https://admin.timsfantasyworld.com/auth/customer/google/callback"
```

## Google Cloud Console 設定

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案
3. 進入「API 和服務」→「憑證」
4. 編輯 OAuth 2.0 用戶端 ID
5. 在「已授權的重新導向 URI」中添加:
   ```
   https://admin.timsfantasyworld.com/auth/customer/google/callback
   ```

## 前端配置

修改前端 Google OAuth 按鈕,指向後端:

```typescript
// 舊的 (錯誤)
const handleGoogleLogin = async () => {
  const result = await sdk.auth.login("customer", "google", {
    callback_url: window.location.origin + "/auth/google/callback"
  })
  window.location.href = result.location
}

// 新的 (正確)
const handleGoogleLogin = () => {
  window.location.href = 'https://admin.timsfantasyworld.com/auth/customer/google'
}
```

## 參考文檔

- [Medusa Environment Variables](https://docs.medusajs.com/learn/fundamentals/environment-variables)
- [Medusa Auth Module](https://docs.medusajs.com/resources/references/auth/google)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

---

**更新日期**: 2025-11-02  
**解決狀態**: ✅ 已解決
