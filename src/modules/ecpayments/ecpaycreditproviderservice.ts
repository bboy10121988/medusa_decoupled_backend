import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import type {
  ProviderWebhookPayload,
  WebhookActionResult,
  CapturePaymentInput,
  CapturePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  PaymentSessionStatus
} from "@medusajs/framework/types"
import { v4 as uuidv4 } from "uuid"
import { getECPayFormURL } from "./funcs"
import { isInTaipeiTimeRange } from "../../internal/funcs"
import { Service } from "../../internal/ecpays"
import { ApiRequestCreditDoAction } from "../../internal/ecpays/models"

/**
 * ECPayCreditProviderService
 *
 * - 提供 Medusa Payment Module 的 ECPay 信用卡支付實作入口
 * - 目前僅提供必要方法的「空實作」與完整註解，方便後續填入實際邏輯
 */
export default class ECPayCreditProviderService extends AbstractPaymentProvider {

  static identifier = "ecpay_credit_card"

  /**
   * 建構子
   *
   * - 方法用途：初始化第三方金流客戶端或連線，並接收框架容器與模組設定。
   * - 參數說明：
   *   - `container`: 由 Medusa 模組提供的 DI 容器（可解析 logger、repositories 等）。
   *   - `config`: 此金流供應商在 `medusa-config.ts` 中註冊時傳入的設定物件。
   * - 回傳值說明：無（建構子不回傳）。
   */
  constructor(
    protected readonly container: Record<string, unknown>,
    protected readonly config: Record<string, unknown> = {}
  ) {
    super(container, config)
  }

  /**
   * initiatePayment
   *
   * - 方法用途：向第三方金流建立/初始化一筆付款會話（payment session），供後續授權/支付流程使用。
   * - 參數說明：
   *   - `input`: 包含金額、幣別與結帳情境（context，如顧客資訊）的初始化輸入。
   * - 回傳值說明：
   *   - 回傳一個物件，至少包含 `data` 欄位（會存入 PaymentSession 的 `data`）。
   */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {

    // 
    const tradeNo = Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join("");

    return {
      id: uuidv4(),
      data: {
        form_url: getECPayFormURL(),
        trade_no: tradeNo
      }
    }
  }

  /**
   * authorizePayment
   *
   * - 方法用途：於下單前授權付款（例如信用卡 3DS 驗證完成後），建立實際 Payment 記錄。
   * - 參數說明：
   *   - `input`: 內含先前 `initiatePayment` 所存於 Session `data` 的資訊，用來在第三方完成授權。
   * - 回傳值說明：
   *   - 回傳 `{ status, data }`；`status` 通常為 `authorized`，`data` 會存入 Payment 的 `data`。
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return{
      status:"authorized" as PaymentSessionStatus,
      data:{}
    }
  }

  /**
   * capturePayment
   *
   * - 方法用途：對已授權的付款進行請款（capture）。通常由後台操作或自動流程觸發。
   * - 參數說明：
   *   - `input`: 內含 Payment `data`（通常有第三方的付款識別），用以在第三方執行請款。
   * - 回傳值說明：
   *   - 回傳 `{ data }`；可回存第三方回傳的最新付款資料至 Payment 的 `data`。
   */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return {
      data:input.data
    }
  }

  /**
   * refundPayment
   *
   * - 方法用途：對已請款成功的付款進行退款（可為部分或全部）。
   * - 參數說明：
   *   - `input`: 內含 Payment `data` 與退款金額 `amount` 等，用以在第三方執行退款。
   * - 回傳值說明：
   *   - 回傳 `{ data }`；可回存第三方回傳的退款結果至 Payment 的 `data`。
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {

    const action: string = this.getIdentifier() + " refundPayment"

    console.log(action,"start refundPayment with input:", input)

    console.log(action,"refundPayment input.data:",input.data)
    
    try{

      // check: 時間不能是20:15 - 20:30
      if (isInTaipeiTimeRange(new Date())){
        throw new Error("ECPay 退款 在每日 20:15 - 20:30 之間無法使用，請稍後再試")
      }

      // ecpay api 必要資料：
      // - MarchantID 特店代號: from .env
      // - CreditRefundId 退款交易序號(gwsr) from input.data
      // - CreditAmount 金額 from input.amount
      // - CreditCheckCode 商家檢查碼 from .env

      const creditCheckCode = parseInt(process.env.ECPAY_CREDIT_CHECK_CODE || "0")
      const creditRefundId = parseInt(String(input.data?.credit_refund_id))
      const creditAmount = Number(input.amount.toString())

      if (creditCheckCode === 0){
        console.log("process.env.ECPAY_CREDIT_CHECK_CODE", process.env.ECPAY_CREDIT_CHECK_CODE)
        throw new Error("ECPAY_CREDIT_CHECK_CODE is not set in environment variables or invalid")
      }

      if (!creditRefundId || creditRefundId == 0 || creditAmount <= 0){
        console.log("creditRefundId is empty or creditAmount is invalid:", creditRefundId,creditAmount)
        throw new Error("Invalid creditRefundId or creditAmount")
      }


      // 1. 呼叫查詢信用卡單筆明細記錄API取得訂單狀態

      const ecpayService = Service.createDefault()

      const creditDetail = await ecpayService.getCreditDetail({
        CreditCheckCode:creditCheckCode,
        CreditRefundId: creditRefundId,
        CreditAmount: creditAmount
      })

      // 2.判斷訂單close_data中最後一筆amout為正向的資料狀態
      
      if (creditDetail.RtnValue.close_data.length == 0){
        console.log("creditDetail.RtnValue.close_data is empty")
        throw new Error("信用卡退款查詢無法取得訂單狀態")
      }

      const closeData = creditDetail.RtnValue.close_data[creditDetail.RtnValue.close_data.length - 1]
      const closeAmount:number = parseInt(closeData.amount)

      if (closeAmount < 0){
        console.log("The order has been fully refunded already.")
        throw new Error("此筆訂單已經全額退款，無法再進行退款")
      }

      // 3. 查詢後，呼叫信用卡請退款API:
      //   - [已授權]階段: 執行[放棄] (Action=N)可釋放信用卡佔額。
      //   - [要關帳]階段:
      //     - 全額退款: 先執行[取消] (Action=E)，接著進行[放棄] (Action=N)。
      //     - 部份退款: 執行[退刷] (Action=R)。
      //   - [已關帳]階段: 執行[退刷] (Action=R)。
      //   - [操作取消]階段: 執行[放棄] (Action=N)可釋放信用卡佔額。
    
      // ecpay action 必要資料：
      // - MerchantTradeNo

      const merchantTradeNo = input.data?.merchant_trade_no;
      const tradeNo = input.data?.trade_no;
      const totalAmount = closeAmount

      if (!merchantTradeNo){
        console.log("merchantTradeNo is empty:", merchantTradeNo)
        throw new Error("Invalid merchantTradeNo")
      }

      if (!tradeNo){
        console.log("tradeNo is empty:", tradeNo)
        throw new Error("Invalid tradeNo")
      }

      if (totalAmount <= 0){
        console.log("totalAmount is invalid:", totalAmount)
        throw new Error("Invalid totalAmount")
      }

      let actionParam: ApiRequestCreditDoAction = {
        MerchantTradeNo:merchantTradeNo,
        TradeNo: tradeNo,
        TotalAmount: totalAmount,
      } as ApiRequestCreditDoAction


      switch (creditDetail.RtnValue.status){
        case "已授權":
          actionParam.Action = "N"
          await ecpayService.doCreditAction(actionParam)
          break
        case "要關帳":
          
          actionParam.Action = "E"
          await ecpayService.doCreditAction(actionParam)

          actionParam.Action = "N"
          await ecpayService.doCreditAction(actionParam)

          break
        case "已關帳":
          actionParam.Action = "R"
          await ecpayService.doCreditAction(actionParam)
          break
        case "操作取消":
          actionParam.Action = "N"
          await ecpayService.doCreditAction(actionParam)
          break
        default:
          console.log("Unknown order status:", creditDetail.RtnValue.status)
          throw new Error("Unknown order status, please contact customer service")
      }

      return { data: input.data }

    }catch(error){
      console.log("refundPayment error:", error)
      throw error
    }
    
  }

  /**
   * retrievePayment
   *
   * - 方法用途：向第三方查詢付款詳情，以回傳最新狀態或資料。
   * - 參數說明：
   *   - `input`: 內含 Payment `data`（例如第三方付款編號），用於第三方查詢付款。
   * - 回傳值說明：
   *   - 回傳第三方付款的資料物件。
   */
  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    throw new Error("ECPayCreditProviderService.retrievePayment 尚未實作")
  }

  /**
   * cancelPayment
   *
   * - 方法用途：取消尚未請款的付款（通常用於訂單取消）。
   * - 參數說明：
   *   - `input`: 內含 Payment `data`，用以在第三方執行取消。
   * - 回傳值說明：
   *   - 回傳 `{ data }`（如需回存第三方取消結果）。
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    throw new Error("ECPayCreditProviderService.cancelPayment ")
  }

  /**
   * updatePayment
   *
   * - 方法用途：更新先前以 `initiatePayment` 建立的付款資訊（如金額、顧客資訊等）。
   * - 參數說明：
   *   - `input`: 內含要更新的欄位與既有 Session `data`。
   * - 回傳值說明：
   *   - 回傳最新的付款資料物件，將覆蓋/合併至 Session 的 `data`。
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    
    return {
      data: input.data
    }
    
  }

  /**
   * deletePayment
   *
   * - 方法用途：刪除／作廢已建立但未使用的付款會話（若第三方支援）。
   * - 參數說明：
   *   - `input`: 內含 Session `data`，用以在第三方取消/刪除對應會話。
   * - 回傳值說明：
   *   - 回傳 `{ data }`；可原樣回傳或附上第三方回應結果。
   */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {
      data: input.data
    }
  }

  /**
   * getPaymentStatus
   *
   * - 方法用途：查詢付款會話或付款單在第三方的即時狀態，回傳 Medusa 可理解的狀態值。
   * - 參數說明：
   *   - `input`: 內含 Session/Payment `data`，用以在第三方查詢狀態。
   * - 回傳值說明：
   *   - 回傳 `{ status, data? }`；`status` 可能為 `pending`、`authorized`、`captured`、`canceled` 等。
   */
  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    throw new Error("ECPayCreditProviderService.getPaymentStatus 尚未實作")
  }

  /**
   * getWebhookActionAndData
   * route: http://localhost:9000/hooks/payment/ecpay_credit_card_ecpay_credit_card
   * - 方法用途：處理第三方金流的 Webhook，並回傳應由 Medusa 採取的動作與所需資料。
   * - 參數說明：
   *   - `payload`: Webhook 原始負載（headers、rawData、解析後資料等）。
   * - 回傳值說明：
   *   - 回傳 `{ action, data }`；`action` 可為 `authorized`、`captured`、`failed`、`not_supported`。
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {

    throw new Error("ECPayCreditProviderService.getWebhookActionAndData medusa 不支援ECPay Post Form格式")
    // const data = payload.data
    // let paymentSessionID: string = ""

    // if (!data){
    //   throw new Error("payload.data is empty")
    // }

    // if (!data["CustomField4"]){
    //   throw new Error("Payment Session ID is missing")
    // }else if (typeof data["CustomField4"] === "string") {
    //   paymentSessionID = data["CustomField4"]
    // } else {
    //   paymentSessionID = `${data["CustomField4"]}`
    // }

    // if (!data["RtnCode"]){
    //   throw new Error("RtnCode is missing")
    // }

    // // 除了成功以外，都不要更新訂單狀態
    // switch (data["RtnCode"]) {
    //   case "1":
    //     break;
    //   case "10300066":
    //     // 「交易付款結果待確認中，請勿出貨」，請至廠商管理後台確認已付款完成再出貨。
    //     throw new Error("交易付款結果待確認中，請勿出貨")
    //   case "10100248":
    //     // 「拒絕交易，請客戶聯繫發卡行確認原因」
    //     throw new Error("拒絕交易，請客戶聯繫發卡行確認原因")
    //   case "10100252":
    //     // 「額度不足，請客戶檢查卡片額度或餘額」
    //     throw new Error("額度不足，請客戶檢查卡片額度或餘額")
    //   case "10100254":
    //     // 「交易失敗，請客戶聯繫發卡行確認交易限制」
    //     throw new Error("交易失敗，請客戶聯繫發卡行確認交易限制")
    //   case "10100251":
    //     // 「卡片過期，請客戶檢查卡片重新交易」
    //     throw new Error("卡片過期，請客戶檢查卡片重新交易")
    //   case "10100255":
    //     // 「報失卡，請客戶更換卡片重新交易」
    //     throw new Error("報失卡，請客戶更換卡片重新交易")
    //   case "10100256":
    //     // 「停用卡，請客戶更換卡片重新交易」
    //     throw new Error("停用卡，請客戶更換卡片重新交易")
    //   default:
    //     // 其他錯誤代碼
    //     throw new Error("未知錯誤，請聯繫客服")
    // }

    
    // return {
    //   action: "captured",
    //   data: {
    //     // assuming the session_id is stored in the metadata of the payment
    //     // in the third-party provider
    //     session_id: paymentSessionID,
    //     amount: data["TradeAmt"]?new BigNumber(data["TradeAmt"] as number):0
    //   }
    // }
    
  }
}
