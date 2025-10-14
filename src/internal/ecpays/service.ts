import * as models from './models';
import {createCheckMac} from './funcs';

class Service {

    public merchantID: string = '';
    public host:string = '';
    public hashKey: string = '';
    public hashIV: string = '';

    constructor(merchantID: string, host: string, hashKey: string, hashIV: string) {
        this.merchantID = merchantID;
        this.host = host;
        this.hashKey = hashKey;
        this.hashIV = hashIV;
    }

    static createDefault(): Service{
        

        const merchantID = process.env.ECPAY_MERCHANT_ID || '';
        const host = process.env.ECPAY_HOST || 'https://payment.ecpay.com.tw';
        const hashKey = process.env.ECPAY_HASH_KEY || '';
        const hashIV = process.env.ECPAY_HASH_IV || '';

        if (!merchantID){
            throw new Error("ECPAY_MERCHANT_ID is not set in environment variables");
        }

        if (!hashKey){
            throw new Error("ECPAY_HASH_KEY is not set in environment variables");
        }

        if (!hashIV){
            throw new Error("ECPAY_HASH_IV is not set in environment variables");
        }

        if (!host){
            throw new Error("ECPAY_HOST is not set in environment variables");
        }


        return new Service(
            merchantID,
            host,
            hashKey,
            hashIV
        );
    }

    public getMerchantID(): string{
        return this.merchantID;
    }

    public getHashKey(): string{
        return this.hashKey;
    }

    public getHashIV(): string{
        return this.hashIV;
    }

    public getHost(): string{
        return this.host;
    }

    public getURL(path:string){
        return this.host + path;
    }

    


    async getCreditDetail(param: models.ApiRequestCreditDetail) : Promise<models.ApiResponseCreditDetail>{
        
        // 構建請求參數使用 URLSearchParams
        const requestData = new URLSearchParams({
            MerchantID: this.merchantID,
            CreditRefundId: param.CreditRefundId.toString(),
            CreditAmount: param.CreditAmount.toString(),
            CreditCheckCode: param.CreditCheckCode.toString()
        });

        // 為了生成檢查碼，需要轉換為物件格式
        // const dataForMac = Object.fromEntries(requestData);
        const checkMacValue = createCheckMac(requestData, this.hashKey, this.hashIV);
        
        // 添加檢查碼到請求參數
        requestData.append('CheckMacValue', checkMacValue);

        try {
            // 發送 POST 請求到綠界 API
            const response = await fetch(this.getURL('/CreditDetail/QueryTrade/V2'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: requestData.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 直接解析 JSON 響應
            const responseData = await response.json();
            const result: models.ApiResponseCreditDetail = {
                RtnMsg: responseData.RtnMsg || '',
                RtnValue: {
                    TradeID: responseData.RtnValue?.TradeID || '',
                    amount: responseData.RtnValue?.amount || '',
                    clsamt: responseData.RtnValue?.clsamt || '',
                    authtime: responseData.RtnValue?.authtime || '',
                    status: responseData.RtnValue?.status || '',
                    close_data: responseData.RtnValue?.close_data || []
                }
            };

            return result;

        } catch (error) {
            throw new Error(`Failed to get credit detail: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async doCreditAction(param: models.ApiRequestCreditDoAction): Promise<models.ApiResponseCreditDoAction>{
        
        // 構建請求參數使用 URLSearchParams
        const requestData = new URLSearchParams({
            MerchantID: this.merchantID,
            MerchantTradeNo: param.MerchantTradeNo,
            TradeNo: param.TradeNo,
            Action: param.Action,
            TotalAmount: param.TotalAmount.toString(),
        });

        // 生成檢查碼
        const checkMacValue = createCheckMac(requestData, this.hashKey, this.hashIV);
        
        // 添加檢查碼到請求參數
        requestData.append('CheckMacValue', checkMacValue);

        try {
            // 發送 POST 請求到綠界 API
            const response = await fetch(this.getURL('/CreditDetail/DoAction'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: requestData.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 直接解析 JSON 響應
            const responseData = await response.json();
            const result: models.ApiResponseCreditDoAction = {
                MerchantID: responseData.MerchantID || '',
                MerchantTradeNo: responseData.MerchantTradeNo || '',
                TradeNo: responseData.TradeNo || '',
                RtnCode: responseData.RtnCode || 0,
                RtnMsg: responseData.RtnMsg || '',
            };

            return result;

        } catch (error) {
            throw new Error(`Failed to execute credit action: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

}

export default Service;