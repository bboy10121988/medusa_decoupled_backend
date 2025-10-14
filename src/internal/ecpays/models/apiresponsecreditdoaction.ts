export default interface ApiResponseCreditDoAction {
    MerchantID: string,
    MerchantTradeNo: string,
    TradeNo: string,
    RtnCode: number, // 1:成功, 其他失敗
    RtnMsg: string,
}