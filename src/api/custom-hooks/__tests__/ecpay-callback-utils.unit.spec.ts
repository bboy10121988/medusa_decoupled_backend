import { parseEcpayCallback, isSuccessfulPayment, extractOrderInfo } from '../ecpay-callback-utils';

describe('ECPay Callback Utils Tests', () => {
  
  const sampleEcpayJson = `{
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

  describe('parseEcpayCallback', () => {
    
    it('should parse JSON string and convert string numbers to actual numbers', () => {
      const result = parseEcpayCallback(sampleEcpayJson);
      
      // 驗證字串欄位保持不變
      expect(result.MerchantID).toBe('3320313');
      expect(result.MerchantTradeNo).toBe('34192885723839727052');
      expect(result.RtnMsg).toBe('paid');
      expect(result.PaymentType).toBe('Credit_CreditCard');
      
      // 驗證數值欄位被正確轉換
      expect(result.RtnCode).toBe(1);
      expect(typeof result.RtnCode).toBe('number');
      
      expect(result.TradeAmt).toBe(31);
      expect(typeof result.TradeAmt).toBe('number');
      
      expect(result.PaymentTypeChargeFee).toBe(6);
      expect(typeof result.PaymentTypeChargeFee).toBe('number');
      
      expect(result.SimulatePaid).toBe(0);
      expect(typeof result.SimulatePaid).toBe('number');
      
      expect(result.gwsr).toBe(144359533);
      expect(typeof result.gwsr).toBe('number');
      
      expect(result.amount).toBe(31);
      expect(typeof result.amount).toBe('number');
    });

    it('should handle already parsed object', () => {
      const parsedData = JSON.parse(sampleEcpayJson);
      const result = parseEcpayCallback(parsedData);
      
      expect(result.RtnCode).toBe(1);
      expect(result.TradeAmt).toBe(31);
      expect(typeof result.RtnCode).toBe('number');
      expect(typeof result.TradeAmt).toBe('number');
    });

    it('should throw error for invalid JSON string', () => {
      const invalidJson = '{ invalid json }';
      
      expect(() => {
        parseEcpayCallback(invalidJson);
      }).toThrow('Invalid JSON format for ECPay callback data');
    });

    it('should handle empty or undefined numeric fields gracefully', () => {
      const minimalJson = `{
        "MerchantID":"3320313",
        "RtnMsg":"paid",
        "RtnCode":"",
        "TradeAmt":"",
        "gwsr":""
      }`;
      
      const result = parseEcpayCallback(minimalJson);
      
      expect(result.MerchantID).toBe('3320313');
      expect(result.RtnMsg).toBe('paid');
      expect(result.RtnCode).toBeUndefined();
      expect(result.TradeAmt).toBeUndefined();
      expect(result.gwsr).toBeUndefined();
    });

  });

  describe('isSuccessfulPayment', () => {
    
    it('should return true for successful payment', () => {
      const successfulPayment = parseEcpayCallback(sampleEcpayJson);
      
      expect(isSuccessfulPayment(successfulPayment)).toBe(true);
    });

    it('should return false for failed payment', () => {
      const failedPaymentJson = `{
        "RtnCode":"0",
        "RtnMsg":"failed"
      }`;
      
      const failedPayment = parseEcpayCallback(failedPaymentJson);
      
      expect(isSuccessfulPayment(failedPayment)).toBe(false);
    });

    it('should return false for payment with wrong message', () => {
      const wrongMessageJson = `{
        "RtnCode":"1",
        "RtnMsg":"processing"
      }`;
      
      const wrongMessage = parseEcpayCallback(wrongMessageJson);
      
      expect(isSuccessfulPayment(wrongMessage)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      const incompletePayment = parseEcpayCallback('{}');
      
      expect(isSuccessfulPayment(incompletePayment)).toBe(false);
    });

  });

  describe('extractOrderInfo', () => {
    
    it('should extract all order information correctly', () => {
      const callbackData = parseEcpayCallback(sampleEcpayJson);
      const orderInfo = extractOrderInfo(callbackData);
      
      expect(orderInfo.orderId).toBe('order_01K7R3G9S0KB2V7CTKP44NBX7S');
      expect(orderInfo.paymentCollectionId).toBe('pay_col_01K7R3G7TDZAZC3X1XKP20S048');
      expect(orderInfo.paymentSessionId).toBe('payses_01K7R3G7VMB9CMCWMDV7K0R2RJ');
      expect(orderInfo.merchantTradeNo).toBe('34192885723839727052');
      expect(orderInfo.tradeNo).toBe('2510171130360795');
      expect(orderInfo.tradeAmount).toBe(31);
      expect(orderInfo.paymentDate).toBe('2025/10/17 11:33:08');
      expect(orderInfo.paymentType).toBe('Credit_CreditCard');
      expect(orderInfo.isSuccess).toBe(true);
    });

    it('should handle missing optional fields', () => {
      const minimalJson = `{
        "RtnCode":"1",
        "RtnMsg":"paid",
        "CustomField2":"order_123"
      }`;
      
      const callbackData = parseEcpayCallback(minimalJson);
      const orderInfo = extractOrderInfo(callbackData);
      
      expect(orderInfo.orderId).toBe('order_123');
      expect(orderInfo.paymentCollectionId).toBeUndefined();
      expect(orderInfo.paymentSessionId).toBeUndefined();
      expect(orderInfo.merchantTradeNo).toBeUndefined();
      expect(orderInfo.tradeNo).toBeUndefined();
      expect(orderInfo.tradeAmount).toBeUndefined();
      expect(orderInfo.isSuccess).toBe(true);
    });

    it('should correctly identify failed payments', () => {
      const failedJson = `{
        "RtnCode":"0",
        "RtnMsg":"failed",
        "CustomField2":"order_123",
        "TradeAmt":"31"
      }`;
      
      const callbackData = parseEcpayCallback(failedJson);
      const orderInfo = extractOrderInfo(callbackData);
      
      expect(orderInfo.orderId).toBe('order_123');
      expect(orderInfo.tradeAmount).toBe(31);
      expect(orderInfo.isSuccess).toBe(false);
    });

  });

});