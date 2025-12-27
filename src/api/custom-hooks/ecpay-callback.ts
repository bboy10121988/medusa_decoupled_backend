import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { Modules, } from "@medusajs/framework/utils"
import { capturePaymentWorkflow, updateOrderWorkflow, cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import EcpayCallbackBody from "./ecpaycallbackbody"

const ecpayCallBack = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {

    const action: string = "ecpayCallBack"
    const handler: string = "ecpayment_callback"

    console.log(action, "--- NEW CALLBACK RECEIVED ---")
    console.log(action, "Headers:", JSON.stringify(req.headers, null, 2))
    console.log(action, "Body Type:", typeof req.body)
    console.log(action, "Body Content:", JSON.stringify(req.body, null, 2))

    if (req.rawBody) {
        console.log(action, "Raw Body Length:", req.rawBody.length)
        console.log(action, "Raw Body (string):", req.rawBody.toString())
    } else {
        console.log(action, "Raw Body is MISSING")
    }

    try {
        const bodyContent = req.body
        let parsedData: EcpayCallbackBody | null = (bodyContent && Object.keys(bodyContent).length > 0) ? bodyContent as EcpayCallbackBody : null

        // 如果 body 是空的，嘗試從 rawBody 解析 (form-urlencoded)
        if (!parsedData && req.rawBody) {
            console.log(action, "Attempting to parse rawBody as form-urlencoded...")
            const querystring = require('querystring');
            parsedData = querystring.parse(req.rawBody.toString()) as any;
            console.log(action, "Parsed from rawBody:", parsedData)
        }

        if (!parsedData) {
            throw new Error("Request body is empty and rawBody parsing failed")
        }

        const data: EcpayCallbackBody = parsedData
        console.log(action, "Final data to process:", data)


        let orderID: string = ""
        let paymentCollectionID: string = ""
        let paymentSessionID: string = ""

        if (!data.PaymentType || data.PaymentType !== "Credit_CreditCard") {
            console.log(action, "Only Credit_CreditCard is supported, got:", data.PaymentType)
            throw new Error("Only Credit_CreditCard is supported")
        }


        if (!data.CustomField2) {
            throw new Error("CustomField2 (order_id) is missing")
        } else {
            orderID = data.CustomField2
        }

        if (!data.CustomField3) {
            throw new Error("CustomField3 (payment_collection_id) is missing")
        } else {
            paymentCollectionID = data.CustomField3
        }

        if (!data.CustomField4) {
            throw new Error("CustomField4 (payment_session_id) is missing")
        } else {
            paymentSessionID = data.CustomField4
        }



        // 正確：直接拿到 query 實例，呼叫 graph
        const query = req.scope.resolve("query")

        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "payment_collections.*", "payment_collections.payments.*"],
            filters: { id: orderID },
        })

        console.log(action, "list orders : ", orders)

        const theOrder = (orders as any[])?.find((order) => order!.id === orderID)

        if (!theOrder) {
            console.log(action, "order not found by orderID:", orderID)
            throw new Error("Order not found")
        }

        console.log(action, "find order by orderID:", theOrder)

        const thePaymentCollection = (theOrder.payment_collections as any[])?.find((paymentCollection) => paymentCollection!.id === paymentCollectionID)

        if (!thePaymentCollection) {
            console.log(action, "paymentCollection not found by paymentCollectionID:", paymentCollectionID)
            throw new Error("PaymentCollection not found")
        }

        const thePayment = (thePaymentCollection.payments as any[])?.find((payment) => payment?.payment_session_id === paymentSessionID)

        if (!thePayment) {
            console.log(action, "payment not found by paymentSessionID:", paymentSessionID)
            throw new Error("Payment not found")
        }

        const paymentModuleService: any = req.scope.resolve(Modules.PAYMENT)

        if (data.RtnCode === "1") {
            // 修正：直接使用 Payment 的金額作為請款金額，確保與訂單一致且避免 undefined
            // Lornzo 邏輯核心：破壞並重建 Session，以寫入 data
            const callbackAmount = thePayment.amount
            console.log(action, `Payment SUCCESS. Using existing payment amount for capture: ${callbackAmount}`)

            const ecpayData = {
                payment_source: "ecpay",
                payment_type: data.PaymentType,
                payment_code: data.RtnCode,
                payment_msg: data.RtnMsg,
                payment_status: "success",
                payment_amount: callbackAmount,
                merchant_trade_no: data.MerchantTradeNo,
                trade_no: data.TradeNo,
                credit_refund_id: data.gwsr,
            }

            // 更新訂單 Metadata
            await updateOrderWorkflow(req.scope).run({
                input: {
                    id: orderID,
                    user_id: handler,
                    metadata: ecpayData
                }
            })

            // 如果付款成功，就刪掉原本的payment session，並且建立一個含有正確data的新的payment session
            // 取消原本的payment
            await paymentModuleService.cancelPayment(thePayment.id)

            // 刪除原本的payment session
            await paymentModuleService.deletePaymentSession(paymentSessionID)

            // 建立一個新的payment session，並且把callback data放進去
            const createdPaymentSession = await paymentModuleService.createPaymentSession(
                paymentCollectionID,
                {
                    provider_id: thePayment.provider_id,
                    currency_code: thePayment.currency_code,
                    amount: thePayment.amount,
                    data: ecpayData
                }
            )

            console.log(action, "create new payment session result:", createdPaymentSession.id)

            // 藉由auth新的payment session來capture payment
            const createdPayment = await paymentModuleService.authorizePaymentSession(createdPaymentSession.id, {})

            console.log(action, "authorizePaymentSession result payment ID:", createdPayment.id)

            await capturePaymentWorkflow(req.scope).run({
                input: {
                    payment_id: createdPayment.id,
                    amount: Number(callbackAmount)
                },
            })

        } else if (data.RtnCode) {
            // 只有在明確收到綠界的錯誤代碼（非 1）時，才取消訂單
            console.log(action, "Payment failed as per ECPay report. RtnCode:", data.RtnCode, "RtnMsg:", data.RtnMsg)
            await cancelOrderWorkflow(req.scope).run({
                input: {
                    order_id: orderID,
                    canceled_by: handler,
                }
            })
        } else {
            // 如果連 RtnCode 都沒有，說明資料真的有問題，絕對不能取消訂單，直接拋錯讓綠界之後重發
            throw new Error("Invalid ECPay callback data: RtnCode is missing")
        }

    } catch (error: any) {
        console.error(action, "Error processing ECPay callback:", error)
        res.status(400).send("0|Error: " + error.message)
        return
    }

    res.status(200).send("1|OK")
}

export { ecpayCallBack }