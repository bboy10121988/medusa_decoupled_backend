import { parseEcpayCallback, isSuccessfulPayment, extractOrderInfo } from './ecpay-callback-utils';
import EcpayCallbackBody from './ecpaycallbackbody';

/**
 * ECPay 回呼處理範例
 * 
 * 這個檔案展示了如何在實際應用中處理 ECPay 的回呼資料
 */

// 你提供的範例 JSON 資料
const sampleEcpayCallbackJson = `{
  "ATMAccBank":"",
  "ATMAccNo":"",
  "AlipayID":"",
  "AlipayTradeNo":"",
  "CheckMacValue":"401575D222043446AEC48BD5E6F75E627B4EFFD81EF6972F999CD3EAA80A43B4",
  "CustomField1":"",
  "CustomField2":"order_01K7R3G9S0KB2V7CTKP44NBX7S",
  "CustomField3":"pay_col_01K7R3G7TDZAZC3X1XKP20S048",
  "CustomField4":"payses_01K7R3G7VMB9CMCWMDV7K0R2RJ",
  "ExecTimes":"",
  "Frequency":"",
  "MerchantID":"3320313",
  "MerchantTradeNo":"34192885723839727052",
  "PayFrom":"",
  "PaymentDate":"2025/10/17 11:33:08",
  "PaymentNo":"",
  "PaymentType":"Credit_CreditCard",
  "PaymentTypeChargeFee":"6",
  "PeriodAmount":"",
  "PeriodType":"",
  "RtnCode":"1",
  "RtnMsg":"paid",
  "SimulatePaid":"0",
  "StoreID":"",
  "TenpayTradeNo":"",
  "TotalSuccessAmount":"",
  "TotalSuccessTimes":"",
  "TradeAmt":"31",
  "TradeDate":"2025/10/17 11:30:36",
  "TradeNo":"2510171130360795",
  "WebATMAccBank":"",
  "WebATMAccNo":"",
  "WebATMBankName":"",
  "amount":"31",
  "auth_code":"269443",
  "card4no":"3300",
  "card6no":"414763",
  "eci":"5",
  "gwsr":"144359533",
  "process_date":"2025/10/17 11:33:08",
  "red_dan":"0",
  "red_de_amt":"0",
  "red_ok_amt":"0",
  "red_yet":"0",
  "staed":"0",
  "stage":"0",
  "stast":"0"
}`;

/**
 * 處理 ECPay 回呼的主要函數
 */
export function handleEcpayCallback(callbackData: string | any): {
  success: boolean;
  parsedData: EcpayCallbackBody;
  orderInfo: any;
  error?: string;
} {
  try {
    // 1. 解析並轉換 ECPay 回呼資料
    const parsedData = parseEcpayCallback(callbackData);
    
    // 2. 檢查付款是否成功
    const isSuccess = isSuccessfulPayment(parsedData);
    
    // 3. 提取訂單資訊
    const orderInfo = extractOrderInfo(parsedData);
    
    // 4. 記錄處理結果
    console.log('ECPay 回呼處理結果:', {
      isSuccess,
      orderInfo,
      rawData: parsedData
    });
    
    return {
      success: true,
      parsedData,
      orderInfo
    };
    
  } catch (error) {
    console.error('處理 ECPay 回呼時發生錯誤:', error);
    return {
      success: false,
      parsedData: {} as EcpayCallbackBody,
      orderInfo: {},
      error: error instanceof Error ? error.message : '未知錯誤'
    };
  }
}

/**
 * 範例使用方式
 */
export function exampleUsage() {
  console.log('=== ECPay 回呼處理範例 ===');
  
  // 處理範例資料
  const result = handleEcpayCallback(sampleEcpayCallbackJson);
  
  if (result.success) {
    console.log('✅ 成功解析 ECPay 回呼資料');
    console.log('📦 訂單資訊:', result.orderInfo);
    
    if (result.orderInfo.isSuccess) {
      console.log('💰 付款成功！');
      console.log(`- 訂單 ID: ${result.orderInfo.orderId}`);
      console.log(`- 付款金額: ${result.orderInfo.tradeAmount}`);
      console.log(`- 付款方式: ${result.orderInfo.paymentType}`);
      console.log(`- 付款時間: ${result.orderInfo.paymentDate}`);
      console.log(`- 交易編號: ${result.orderInfo.tradeNo}`);
    } else {
      console.log('❌ 付款失敗');
    }
  } else {
    console.log('❌ 解析失敗:', result.error);
  }
  
  return result;
}

// 如果這個檔案被直接執行，運行範例
if (require.main === module) {
  exampleUsage();
}