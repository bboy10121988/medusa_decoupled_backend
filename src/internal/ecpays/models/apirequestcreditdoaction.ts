export default interface ApiRequestCreditDoAction {
    MerchantTradeNo: string,
    TradeNo: string,
    Action: string, // 關帳：C, 退刷：R, 取消：E, 放棄：N
    TotalAmount: number,
}