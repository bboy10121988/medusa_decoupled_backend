# 管理員訂單通知設定指南

## 管理員 Email 設定

管理員訂單通知信的 Email 地址是透過環境變數來設定的。

### 1. 設定位置

在 `.env` 檔案中設定 `ADMIN_EMAIL` 環境變數：

```bash
# 管理員訂單通知 Email
ADMIN_EMAIL=admin@timsfantasyworld.com
```

### 2. 預設值

如果沒有設定 `ADMIN_EMAIL` 環境變數，系統會使用預設值：
- `admin@timsfantasyworld.com`

### 3. 修改步驟

1. 編輯 `.env` 檔案
2. 找到或添加 `ADMIN_EMAIL=你的管理員信箱`
3. 重新啟動 Medusa 後端服務

### 4. 環境變數範本

在 `.env.template` 檔案中也包含了範本設定，方便部署時複製使用。

### 5. 通知觸發時機

當客戶完成訂單時（`order.placed` 事件），系統會自動：
- 發送訂單確認信給客戶
- 發送新訂單通知給管理員（使用 `ADMIN_EMAIL` 設定的信箱）

### 6. 通知內容

管理員會收到包含以下資訊的郵件：
- 訂單編號和日期
- 客戶資訊
- 商品清單和總金額
- 配送地址
- 後台管理連結

### 7. 測試方法

可以透過建立測試訂單來驗證管理員通知是否正常發送。

## 相關檔案

- 環境設定：`/backend_vm/medusa-backend/.env`
- 範本設定：`/backend_vm/medusa-backend/.env.template`
- 通知邏輯：`/backend_vm/medusa-backend/src/subscribers/admin-order-notification.ts`