export default interface EcpayCallbackBody {
    MerchantID?: string
    MerchantTradeNo?: string
    StoreID?: string
    RtnCode?: number
    RtnMsg?: string
    TradeNo?: string
    TradeAmt?: number
    PaymentDate?: string
    PaymentType?: string
    PaymentTypeChargeFee?: number
    TradeDate?: string
    PlatformID?: string
    SimulatePaid?: number
    CustomField1?: string
    CustomField2?: string
    CustomField3?: string
    CustomField4?: string
    CheckMacValue?: string
    gwsr?: number
    amount?: number
}