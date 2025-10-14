export default interface ApiRequestCreditDetail{
    CreditCheckCode: number, // 商家檢查碼：廠商後台->信用卡收單->信用卡授權資訊中可查到。
    CreditRefundId: number, // 信用卡受權單號
    CreditAmount: number,   
}