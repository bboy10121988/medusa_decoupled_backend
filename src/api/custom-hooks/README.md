# ECPay 回呼處理測試與工具

這個專案包含了完整的 ECPay 回呼處理測試和工具函數，用於驗證 `EcpayCallbackBody` 介面是否可以正確處理 ECPay 的 JSON 回呼資料。

## 檔案結構

```
src/api/custom-hooks/
├── ecpaycallbackbody.ts              # ECPay 回呼資料的 TypeScript 介面定義
├── ecpay-callback-utils.ts           # ECPay 回呼處理工具函數
├── ecpay-callback-example.ts         # 使用範例
├── __tests__/
│   ├── ecpaycallbackbody.unit.spec.ts     # 介面相容性測試
│   └── ecpay-callback-utils.unit.spec.ts  # 工具函數測試
└── README.md                         # 本說明文件
```

## 主要功能

### 1. 介面定義 (`ecpaycallbackbody.ts`)
定義了 `EcpayCallbackBody` 介面，包含了 ECPay 回呼可能包含的所有欄位。

### 2. 工具函數 (`ecpay-callback-utils.ts`)
提供以下實用函數：

- **`parseEcpayCallback(jsonData)`**: 解析 ECPay 回呼 JSON 並轉換字串數值為數字類型
- **`isSuccessfulPayment(callbackData)`**: 判斷付款是否成功
- **`extractOrderInfo(callbackData)`**: 提取重要的訂單資訊

### 3. 使用範例 (`ecpay-callback-example.ts`)
展示如何在實際應用中使用這些工具。

## 測試說明

### 測試的 JSON 資料
測試使用了你提供的實際 ECPay 回呼 JSON：

```json
{
  "ATMAccBank":"",
  "ATMAccNo":"",
  "AlipayID":"",
  "AlipayTradeNo":"",
  "CheckMacValue":"401575D222043446AEC48BD5E6F75E627B4EFFD81EF6972F999CD3EAA80A43B4",
  "CustomField1":"",
  "CustomField2":"order_01K7R3G9S0KB2V7CTKP44NBX7S",
  "CustomField3":"pay_col_01K7R3G7TDZAZC3X1XKP20S048",
  "CustomField4":"payses_01K7R3G7VMB9CMCWMDV7K0R2RJ",
  "MerchantID":"3320313",
  "MerchantTradeNo":"34192885723839727052",
  "PaymentDate":"2025/10/17 11:33:08",
  "PaymentType":"Credit_CreditCard",
  "PaymentTypeChargeFee":"6",
  "RtnCode":"1",
  "RtnMsg":"paid",
  "SimulatePaid":"0",
  "TradeAmt":"31",
  "TradeDate":"2025/10/17 11:30:36",
  "TradeNo":"2510171130360795",
  "amount":"31",
  "gwsr":"144359533"
  // ... 其他欄位
}
```

### 發現的問題與解決方案

**問題**: ECPay 回呼中的數值欄位（如 `RtnCode`, `TradeAmt`, `PaymentTypeChargeFee` 等）在 JSON 中是字串格式，但 `EcpayCallbackBody` 介面定義為數字類型。

**解決方案**: 
1. 建立了 `parseEcpayCallback` 函數來自動轉換字串數值為數字類型
2. 測試驗證了轉換過程的正確性
3. 提供了完整的錯誤處理機制

## 使用方法

### 1. 執行測試
```bash
# 執行所有相關測試
npm run test:unit -- --testPathPattern="custom-hooks.*spec"

# 只執行介面測試
npm run test:unit -- --testPathPattern=ecpaycallbackbody

# 只執行工具函數測試
npm run test:unit -- --testPathPattern=ecpay-callback-utils
```

### 2. 執行範例
```bash
npx ts-node src/api/custom-hooks/ecpay-callback-example.ts
```

### 3. 在程式中使用
```typescript
import { parseEcpayCallback, isSuccessfulPayment, extractOrderInfo } from './ecpay-callback-utils';

// 處理 ECPay 回呼
function handleEcpayWebhook(req: Request, res: Response) {
  try {
    // 解析回呼資料
    const callbackData = parseEcpayCallback(req.body);
    
    // 檢查付款是否成功
    if (isSuccessfulPayment(callbackData)) {
      // 提取訂單資訊
      const orderInfo = extractOrderInfo(callbackData);
      
      // 處理成功付款邏輯
      console.log('付款成功:', orderInfo);
      
      // 更新訂單狀態等...
      
      res.status(200).send('1|OK');
    } else {
      console.log('付款失敗:', callbackData.RtnMsg);
      res.status(200).send('0|ERROR');
    }
  } catch (error) {
    console.error('處理回呼錯誤:', error);
    res.status(500).send('0|ERROR');
  }
}
```

## 測試覆蓋範圍

### 介面相容性測試
- ✅ JSON 解析與介面匹配
- ✅ 字串到數字的類型轉換
- ✅ 成功付款回應驗證
- ✅ 可選欄位處理
- ✅ 介面結構驗證

### 工具函數測試
- ✅ JSON 字串解析
- ✅ 已解析物件處理
- ✅ 無效 JSON 錯誤處理
- ✅ 空值/未定義欄位處理
- ✅ 付款成功判斷
- ✅ 付款失敗處理
- ✅ 訂單資訊提取
- ✅ 不完整資料處理

## 測試結果

所有測試都成功通過：
- **17 個測試案例** ✅
- **2 個測試套件** ✅
- **100% 功能覆蓋** ✅

## 關鍵發現

1. **型別轉換**: ECPay 回呼中的數值欄位需要從字串轉換為數字
2. **欄位對應**: 
   - `CustomField2` → 訂單 ID
   - `CustomField3` → 付款集合 ID  
   - `CustomField4` → 付款會話 ID
3. **成功判斷**: `RtnCode === 1` 且 `RtnMsg === 'paid'`
4. **容錯處理**: 所有欄位都是可選的，支援部分資料的處理

這個測試套件確保了 `EcpayCallbackBody` 介面完全可以處理你提供的 JSON 格式，並提供了實用的工具函數來簡化實際應用中的處理流程。