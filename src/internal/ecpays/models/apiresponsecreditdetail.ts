// Interface for close_data array items
interface CloseData {
    status: string
    sno: string
    amount: string
    datetime: string
}

// Interface for RtnValue object
interface RtnValue {
    TradeID: string
    amount: string
    clsamt: string
    authtime: string
    status: string
    close_data: CloseData[]
}

// Main interface for API response
export default interface ApiResponseCreditDetail {
    RtnMsg: string
    RtnValue: RtnValue
}

