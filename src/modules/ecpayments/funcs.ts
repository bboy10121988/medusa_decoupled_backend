import { isEnvironmentModeProd } from "../../internal/configs/environment"

/**
 * getECPayFormURL
 *
 * - 方法用途：根據環境模式回傳對應的 ECPay 付款表單 URL。
 * - 參數說明：無。
 * - 回傳值說明：
 *   - 生產環境回傳正式環境 URL，否則回傳測試環境 URL。
 * - 備註：
 *   - 測試環境：https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
 *   - 正式環境：https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5
 */
function getECPayFormURL(): string {
  if (isEnvironmentModeProd()) {
    return "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5"
  }
  return "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
}

export { getECPayFormURL }

