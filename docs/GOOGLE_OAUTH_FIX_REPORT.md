# Google OAuth 修復完成報告

**日期:** 2025年11月2日  
**狀態:** ✅ 修復已部署  
**需要動作:** 更新 Google Cloud Console 設定

---

## 問題根因

**主要問題**: `GOOGLE_CALLBACK_URL` 設定錯誤

❌ **之前 (錯誤):**
```
GOOGLE_CALLBACK_URL=https://timsfantasyworld.com/auth/google/callback
```
Google 重定向到前端,前端無法處理 OAuth token 交換

✅ **現在 (正確):**
```
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
```
Google 重定向到後端,由 Medusa 正確處理 OAuth flow

---

## 已完成的修復

### 1. ✅ 建立標準 Callback 端點

**檔案**: `src/api/auth/customer/google/callback/route.ts`

**功能**:
- 接收 Google OAuth callback
- 從 Medusa auth middleware 取得認證結果
- 產生 JWT token
- 設定 HTTP-only cookie (domain=.timsfantasyworld.com)
- 重定向回前端

### 2. ✅ 更新環境變數

**已修改**:
```bash
GOOGLE_CALLBACK_URL=https://admin.timsfantasyworld.com/auth/customer/google/callback
FRONTEND_URL=https://timsfantasyworld.com
COOKIE_DOMAIN=.timsfantasyworld.com  # 注意開頭的點
```

**備份位置**: `.env.backup.20251102_064006`

### 3. ✅ 建立診斷工具

- `diagnose-google-oauth.sh` - 診斷配置問題
- `fix-google-oauth.sh` - 自動修復腳本 (已執行)
- `test-google-oauth.sh` - 測試所有端點

### 4. ✅ 文檔

- `docs/GOOGLE_OAUTH_SETUP.md` - 完整設定指南

---

## 🚨 需要手動完成的步驟

### Step 1: 更新 Google Cloud Console (必須!)

1. 訪問: https://console.cloud.google.com/apis/credentials

2. 選擇你的 OAuth 2.0 Client ID

3. 編輯 "Authorized redirect URIs"

4. **加入以下 URI** (一字不差):
   ```
   https://admin.timsfantasyworld.com/auth/customer/google/callback
   ```

5. 點擊「儲存」

**重要**: 不做這步,OAuth 會失敗並出現 `redirect_uri_mismatch` 錯誤!

### Step 2: 測試 OAuth Flow

1. 訪問前端: https://timsfantasyworld.com/tw/account

2. 點擊「使用 Google 登入」

3. 預期流程:
   ```
   前端 → 後端 OAuth 入口 → Google 授權 → 
   後端 callback (設定 cookie) → 前端成功頁面 → 會員中心
   ```

4. 如果成功,你會看到:
   - 重定向到 Google 授權頁面
   - 授權後返回前端
   - 自動登入並顯示會員中心

### Step 3: 監控日誌 (可選)

在另一個終端執行:
```bash
gcloud compute ssh tims-web --zone=asia-east1-c
pm2 logs medusa-backend --lines 0
```

**預期看到的日誌**:
```
=== Google OAuth Callback ===
Profile: { email: '...', ... }
✅ Google Auth: Customer ... already exists/created
🔐 JWT token generated
🍪 Setting cookie...
✅ Cookie set successfully
📤 Redirecting to: https://timsfantasyworld.com/tw/auth/google/callback?success=true
```

---

## 正確的 OAuth 流程

```
1. 使用者點擊「Google 登入」
   ↓
2. 前端重定向到後端
   GET https://admin.timsfantasyworld.com/auth/customer/google
   ↓
3. 後端產生 Google OAuth URL
   302 → https://accounts.google.com/o/oauth2/v2/auth?...
   ↓
4. 使用者在 Google 授權
   ↓
5. Google 重定向回後端 ⭐ (關鍵!)
   GET https://admin.timsfantasyworld.com/auth/customer/google/callback?code=xxx
   ↓
6. 後端處理 callback
   - 用 code 交換 access_token
   - 取得 Google 使用者資訊
   - 建立/查找 customer
   - 產生 JWT token
   - 設定 _medusa_jwt cookie (httpOnly, secure)
   ↓
7. 後端重定向回前端
   302 → https://timsfantasyworld.com/tw/auth/google/callback?success=true
   (Cookie 已自動設定)
   ↓
8. 前端顯示成功並重定向到會員中心
   /tw/account
   ↓
9. ✅ 登入成功!
```

---

## 常見問題排查

### Q1: 看到 `redirect_uri_mismatch` 錯誤

**原因**: Google Cloud Console 的 Authorized redirect URIs 未更新

**解決**: 完成 Step 1 (更新 Google Cloud Console)

### Q2: 授權後停留在空白頁面

**原因**: 後端 callback 端點可能有問題

**解決**:
```bash
# 查看後端日誌
gcloud compute ssh tims-web --zone=asia-east1-c
pm2 logs medusa-backend --err --lines 50
```

### Q3: Cookie 沒有設定

**原因**: 
- `COOKIE_DOMAIN` 設定錯誤
- 前端請求沒有 `credentials: 'include'`

**解決**: 
- 已修復 `COOKIE_DOMAIN=.timsfantasyworld.com`
- 確認前端 SDK 配置有 `fetchConfig: { credentials: 'include' }`

### Q4: 401 Unauthorized (POST /auth/session)

**原因**: 舊的 cookie 仍在使用,或 cookie domain 錯誤

**解決**:
1. 清除瀏覽器 cookie
2. 重新測試 Google 登入流程

---

## 驗證檢查清單

部署後確認:

- [x] 後端服務正常運行 (pm2 status: online)
- [x] 環境變數已更新 (GOOGLE_CALLBACK_URL 指向後端)
- [x] Cookie domain 正確 (.timsfantasyworld.com)
- [ ] Google Cloud Console Authorized redirect URIs 已更新
- [ ] 測試 Google 登入流程成功
- [ ] 會員中心頁面顯示使用者資料

---

## 相關文件

- 📖 完整設定指南: `docs/GOOGLE_OAUTH_SETUP.md`
- 🔧 修復腳本: `fix-google-oauth.sh` (已執行)
- 🧪 測試腳本: `test-google-oauth.sh`
- 🔍 診斷腳本: `diagnose-google-oauth.sh`

---

## 下一步

1. ✅ 後端修復已完成
2. ⏳ **請更新 Google Cloud Console** (Step 1)
3. ⏳ 測試 Google 登入流程 (Step 2)
4. ⏳ 確認使用者可以成功登入會員中心

---

**部署時間**: 2025-11-02 14:41 (UTC+8)  
**Git Commit**: fd91053  
**服務狀態**: ✅ Online  
**Uptime**: 46 seconds
