import EcpayCallbackBody from '../ecpaycallbackbody';

describe('EcpayCallbackBody Interface Tests', () => {
  
  describe('JSON Parsing and Interface Compatibility', () => {
    
    it('should successfully parse the provided JSON and match EcpayCallbackBody interface', () => {
      // 你提供的 JSON 資料
      const jsonString = `{
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

      // 解析 JSON
      const parsedData = JSON.parse(jsonString);
      
      // 測試 JSON 解析是否成功
      expect(parsedData).toBeDefined();
      expect(typeof parsedData).toBe('object');
      
      // 測試關鍵欄位是否存在且類型正確
      expect(parsedData.MerchantID).toBeDefined();
      expect(parsedData.MerchantTradeNo).toBeDefined();
      expect(parsedData.CheckMacValue).toBeDefined();
      expect(parsedData.RtnCode).toBeDefined();
      expect(parsedData.RtnMsg).toBeDefined();
      
      // 直接測試原始 JSON 資料（字串格式）
      expect(parsedData.MerchantID).toBe('3320313');
      expect(parsedData.MerchantTradeNo).toBe('34192885723839727052');
      expect(parsedData.CheckMacValue).toBe('401575D222043446AEC48BD5E6F75E627B4EFFD81EF6972F999CD3EAA80A43B4');
      expect(parsedData.RtnCode).toBe('1'); // JSON 中是字串
      expect(parsedData.RtnMsg).toBe('paid');
      expect(parsedData.TradeNo).toBe('2510171130360795');
      expect(parsedData.TradeAmt).toBe('31'); // JSON 中是字串
      expect(parsedData.PaymentDate).toBe('2025/10/17 11:33:08');
      expect(parsedData.PaymentType).toBe('Credit_CreditCard');
      expect(parsedData.PaymentTypeChargeFee).toBe('6'); // JSON 中是字串
      expect(parsedData.TradeDate).toBe('2025/10/17 11:30:36');
      expect(parsedData.SimulatePaid).toBe('0'); // JSON 中是字串
      
      // 創建轉換函數並測試轉換後的資料
      const convertToEcpayCallbackBody = (data: any): EcpayCallbackBody => {
        return {
          ...data,
          RtnCode: data.RtnCode ? parseInt(data.RtnCode, 10) : undefined,
          TradeAmt: data.TradeAmt ? parseInt(data.TradeAmt, 10) : undefined,
          PaymentTypeChargeFee: data.PaymentTypeChargeFee ? parseInt(data.PaymentTypeChargeFee, 10) : undefined,
          SimulatePaid: data.SimulatePaid ? parseInt(data.SimulatePaid, 10) : undefined,
          gwsr: data.gwsr ? parseInt(data.gwsr, 10) : undefined,
          amount: data.amount ? parseInt(data.amount, 10) : undefined,
        };
      };

      const ecpayData = convertToEcpayCallbackBody(parsedData);
      
      // 驗證轉換後的數值欄位
      expect(ecpayData.RtnCode).toBe(1);
      expect(ecpayData.TradeAmt).toBe(31);
      expect(ecpayData.PaymentTypeChargeFee).toBe(6);
      expect(ecpayData.SimulatePaid).toBe(0);
      
      // 驗證自訂欄位
      expect(ecpayData.CustomField1).toBe('');
      expect(ecpayData.CustomField2).toBe('order_01K7R3G9S0KB2V7CTKP44NBX7S');
      expect(ecpayData.CustomField3).toBe('pay_col_01K7R3G7TDZAZC3X1XKP20S048');
      expect(ecpayData.CustomField4).toBe('payses_01K7R3G7VMB9CMCWMDV7K0R2RJ');
      
      // 驗證額外欄位
      expect(ecpayData.gwsr).toBe(144359533);
      expect(ecpayData.amount).toBe(31);
    });

    it('should handle type conversion from string to number for numeric fields', () => {
      const jsonString = `{
        "MerchantID":"3320313",
        "RtnCode":"1",
        "TradeAmt":"31",
        "PaymentTypeChargeFee":"6",
        "SimulatePaid":"0",
        "gwsr":"144359533",
        "amount":"31"
      }`;

      const parsedData = JSON.parse(jsonString);
      
      // 創建一個轉換函數來處理字串到數字的轉換
      const convertToEcpayCallbackBody = (data: any): EcpayCallbackBody => {
        return {
          ...data,
          RtnCode: data.RtnCode ? parseInt(data.RtnCode, 10) : undefined,
          TradeAmt: data.TradeAmt ? parseInt(data.TradeAmt, 10) : undefined,
          PaymentTypeChargeFee: data.PaymentTypeChargeFee ? parseInt(data.PaymentTypeChargeFee, 10) : undefined,
          SimulatePaid: data.SimulatePaid ? parseInt(data.SimulatePaid, 10) : undefined,
          gwsr: data.gwsr ? parseInt(data.gwsr, 10) : undefined,
          amount: data.amount ? parseInt(data.amount, 10) : undefined,
        };
      };

      const ecpayData = convertToEcpayCallbackBody(parsedData);
      
      // 驗證類型轉換
      expect(typeof ecpayData.RtnCode).toBe('number');
      expect(typeof ecpayData.TradeAmt).toBe('number');
      expect(typeof ecpayData.PaymentTypeChargeFee).toBe('number');
      expect(typeof ecpayData.SimulatePaid).toBe('number');
      expect(typeof ecpayData.gwsr).toBe('number');
      expect(typeof ecpayData.amount).toBe('number');
      
      // 驗證轉換後的值
      expect(ecpayData.RtnCode).toBe(1);
      expect(ecpayData.TradeAmt).toBe(31);
      expect(ecpayData.PaymentTypeChargeFee).toBe(6);
      expect(ecpayData.SimulatePaid).toBe(0);
      expect(ecpayData.gwsr).toBe(144359533);
      expect(ecpayData.amount).toBe(31);
    });

    it('should validate successful payment response', () => {
      const successfulPaymentJson = `{
        "MerchantID":"3320313",
        "MerchantTradeNo":"34192885723839727052",
        "RtnCode":"1",
        "RtnMsg":"paid",
        "TradeNo":"2510171130360795",
        "TradeAmt":"31",
        "PaymentDate":"2025/10/17 11:33:08",
        "PaymentType":"Credit_CreditCard",
        "CheckMacValue":"401575D222043446AEC48BD5E6F75E627B4EFFD81EF6972F999CD3EAA80A43B4"
      }`;

      const parsedData = JSON.parse(successfulPaymentJson);
      
      // 驗證原始 JSON 資料（字串格式）
      expect(parsedData.RtnCode).toBe('1'); // JSON 中是字串
      expect(parsedData.RtnMsg).toBe('paid');
      expect(parsedData.TradeNo).toBeTruthy();
      expect(parsedData.PaymentDate).toBeTruthy();
      expect(parsedData.CheckMacValue).toBeTruthy();
      
      // 轉換為正確的類型
      const convertToEcpayCallbackBody = (data: any): EcpayCallbackBody => {
        return {
          ...data,
          RtnCode: data.RtnCode ? parseInt(data.RtnCode, 10) : undefined,
          TradeAmt: data.TradeAmt ? parseInt(data.TradeAmt, 10) : undefined,
        };
      };

      const ecpayData = convertToEcpayCallbackBody(parsedData);
      
      // 驗證付款成功的必要條件（轉換後）
      expect(ecpayData.RtnCode).toBe(1); // 轉換為數字後
      expect(ecpayData.RtnMsg).toBe('paid');
      expect(ecpayData.TradeNo).toBeTruthy();
      expect(ecpayData.PaymentDate).toBeTruthy();
      expect(ecpayData.CheckMacValue).toBeTruthy();
    });

    it('should handle optional fields gracefully', () => {
      const minimalJson = `{
        "MerchantID":"3320313",
        "RtnCode":"1",
        "RtnMsg":"paid"
      }`;

      const parsedData = JSON.parse(minimalJson);
      
      // 驗證原始 JSON 資料（字串格式）
      expect(parsedData.MerchantID).toBe('3320313');
      expect(parsedData.RtnCode).toBe('1'); // JSON 中是字串
      expect(parsedData.RtnMsg).toBe('paid');
      
      // 轉換為正確的類型
      const convertToEcpayCallbackBody = (data: any): EcpayCallbackBody => {
        return {
          ...data,
          RtnCode: data.RtnCode ? parseInt(data.RtnCode, 10) : undefined,
        };
      };

      const ecpayData = convertToEcpayCallbackBody(parsedData);
      
      // 驗證轉換後的必要欄位
      expect(ecpayData.MerchantID).toBe('3320313');
      expect(ecpayData.RtnCode).toBe(1); // 轉換為數字後
      expect(ecpayData.RtnMsg).toBe('paid');
      
      // 驗證可選欄位為 undefined
      expect(ecpayData.TradeNo).toBeUndefined();
      expect(ecpayData.TradeAmt).toBeUndefined();
      expect(ecpayData.CustomField1).toBeUndefined();
    });

  });

  describe('Interface Structure Validation', () => {
    
    it('should have all required properties defined as optional', () => {
      // 建立一個空的 EcpayCallbackBody 物件來測試介面結構
      const emptyEcpayData: EcpayCallbackBody = {};
      
      // 所有屬性都應該是可選的，所以空物件應該是有效的
      expect(emptyEcpayData).toBeDefined();
      expect(typeof emptyEcpayData).toBe('object');
    });

    it('should accept all properties from the interface', () => {
      const fullEcpayData: EcpayCallbackBody = {
        MerchantID: '3320313',
        MerchantTradeNo: '34192885723839727052',
        StoreID: '',
        RtnCode: 1,
        RtnMsg: 'paid',
        TradeNo: '2510171130360795',
        TradeAmt: 31,
        PaymentDate: '2025/10/17 11:33:08',
        PaymentType: 'Credit_CreditCard',
        PaymentTypeChargeFee: 6,
        TradeDate: '2025/10/17 11:30:36',
        PlatformID: '',
        SimulatePaid: 0,
        CustomField1: '',
        CustomField2: 'order_01K7R3G9S0KB2V7CTKP44NBX7S',
        CustomField3: 'pay_col_01K7R3G7TDZAZC3X1XKP20S048',
        CustomField4: 'payses_01K7R3G7VMB9CMCWMDV7K0R2RJ',
        CheckMacValue: '401575D222043446AEC48BD5E6F75E627B4EFFD81EF6972F999CD3EAA80A43B4',
        gwsr: 144359533,
        amount: 31
      };
      
      expect(fullEcpayData).toBeDefined();
      expect(fullEcpayData.MerchantID).toBe('3320313');
      expect(fullEcpayData.RtnCode).toBe(1);
      expect(fullEcpayData.gwsr).toBe(144359533);
    });

  });

});