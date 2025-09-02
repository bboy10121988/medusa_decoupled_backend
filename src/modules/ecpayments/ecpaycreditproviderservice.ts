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
} from "@medusajs/framework/types"
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
    throw new Error("ECPayCreditProviderService.initiatePayment 尚未實作")
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
    throw new Error("ECPayCreditProviderService.authorizePayment 尚未實作")
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
    throw new Error("ECPayCreditProviderService.capturePayment 尚未實作")
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
    throw new Error("ECPayCreditProviderService.refundPayment 尚未實作")
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
    throw new Error("ECPayCreditProviderService.cancelPayment 尚未實作")
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
    throw new Error("ECPayCreditProviderService.updatePayment 尚未實作")
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
    throw new Error("ECPayCreditProviderService.deletePayment 尚未實作")
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
   *
   * - 方法用途：處理第三方金流的 Webhook，並回傳應由 Medusa 採取的動作與所需資料。
   * - 參數說明：
   *   - `payload`: Webhook 原始負載（headers、rawData、解析後資料等）。
   * - 回傳值說明：
   *   - 回傳 `{ action, data }`；`action` 可為 `authorized`、`captured`、`failed`、`not_supported`。
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    throw new Error("ECPayCreditProviderService.getWebhookActionAndData 尚未實作")
  }
}
