import EcpayCallbackBody from './ecpaycallbackbody';

/**
 * 將 ECPay 回呼的 JSON 資料轉換為 EcpayCallbackBody 介面
 * ECPay 回呼中的數值欄位通常是字串格式，需要轉換為數字
 */
export function parseEcpayCallback(jsonData: string | any): EcpayCallbackBody {
  let data: any;
  
  // 如果傳入的是字串，先解析 JSON
  if (typeof jsonData === 'string') {
    try {
      data = JSON.parse(jsonData);
    } catch (error) {
      throw new Error('Invalid JSON format for ECPay callback data');
    }
  } else {
    data = jsonData;
  }

  // 轉換字串數值為數字類型
  const converted: EcpayCallbackBody = {
    ...data,
    // 數值類型欄位的轉換
    RtnCode: data.RtnCode ? parseInt(data.RtnCode, 10) : undefined,
    TradeAmt: data.TradeAmt ? parseInt(data.TradeAmt, 10) : undefined,
    PaymentTypeChargeFee: data.PaymentTypeChargeFee ? parseInt(data.PaymentTypeChargeFee, 10) : undefined,
    SimulatePaid: data.SimulatePaid ? parseInt(data.SimulatePaid, 10) : undefined,
    gwsr: data.gwsr ? parseInt(data.gwsr, 10) : undefined,
    amount: data.amount ? parseInt(data.amount, 10) : undefined,
  };

  return converted;
}

/**
 * 驗證 ECPay 回呼是否為成功的付款
 */
export function isSuccessfulPayment(callbackData: EcpayCallbackBody): boolean {
  return callbackData.RtnCode === "1" && callbackData.RtnMsg === 'paid';
}

/**
 * 從 ECPay 回呼資料中提取重要的訂單資訊
 */
export function extractOrderInfo(callbackData: EcpayCallbackBody) {
  return {
    orderId: callbackData.CustomField2, // 通常在 CustomField2 中存放訂單 ID
    paymentCollectionId: callbackData.CustomField3, // 付款集合 ID
    paymentSessionId: callbackData.CustomField4, // 付款會話 ID
    merchantTradeNo: callbackData.MerchantTradeNo,
    tradeNo: callbackData.TradeNo,
    tradeAmount: callbackData.TradeAmt,
    paymentDate: callbackData.PaymentDate,
    paymentType: callbackData.PaymentType,
    isSuccess: isSuccessfulPayment(callbackData),
  };
}