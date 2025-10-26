import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { Modules,} from "@medusajs/framework/utils"
import { capturePaymentWorkflow,updateOrderWorkflow,cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import EcpayCallbackBody from "./ecpaycallbackbody"

const ecpayCallBack = async (req: MedusaRequest, res: MedusaResponse,next: MedusaNextFunction) => {
    
    const action: string = "ecpayCallBack"
    const handler: string = "ecpayment_callback"
    
    console.log(action,"Received ECPay callback",req.body)
    
    try {
        const body = req.body

        if (!body) {
            throw new Error("Request body is empty")
        }

        const data = body as EcpayCallbackBody

        console.log(action,"Parsed ECPay callback data:",data)


        let orderID: string = ""
        let paymentCollectionID: string = ""
        let paymentSessionID: string = ""

        if (!data.PaymentType || data.PaymentType !== "Credit_CreditCard"){
            console.log(action,"Only Credit_CreditCard is supported, got:",data.PaymentType)
            throw new Error("Only Credit_CreditCard is supported")
        }
        

        if (!data.CustomField2){
            throw new Error("CustomField2 (order_id) is missing")
        }else{
            orderID = data.CustomField2
        }

        if (!data.CustomField3){
            throw new Error("CustomField3 (payment_collection_id) is missing")
        }else{
            paymentCollectionID = data.CustomField3
        }

        if (!data.CustomField4){
            throw new Error("CustomField4 (payment_session_id) is missing")
        }else{
            paymentSessionID = data.CustomField4
        }

        // if (data.RtnCode !== "1"){
        //     throw new Error("Unhandled RtnCode: " + data.RtnCode)
        // }
        
        // 正確：直接拿到 query 實例，呼叫 graph
        const query = req.scope.resolve("query")

        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "payment_collections.*","payment_collections.payments.*"],
            filters: { id: orderID },
        })

        console.log(action,"list orders : ",orders)

        const theOrder = orders?.find((order) => order!.id === orderID)

        if (!theOrder){
            console.log(action,"order not found by orderID:",orderID)
            throw new Error("Order not found")
        }

        console.log(action,"find order by orderID:",theOrder)

        const thePaymentCollection = theOrder.payment_collections?.find((paymentCollection) => paymentCollection!.id === paymentCollectionID)

        if (!thePaymentCollection){
            console.log(action,"paymentCollection not found by paymentCollectionID:",paymentCollectionID)
            throw new Error("PaymentCollection not found")
        }

        const thePayment = thePaymentCollection.payments?.find((payment) => payment?.payment_session_id === paymentSessionID)

        if (!thePayment){
            console.log(action,"payment not found by paymentSessionID:",paymentSessionID)
            throw new Error("Payment not found")
        }

        const paymentModuleService = req.scope.resolve(Modules.PAYMENT)

        // 試驗証明：updatePaymentSession根本一點屁用沒有，裡面的data只有在init的時候可以何存，之後的更新都不會影響到payment的data欄位
        // 只好把原本data的地方直接放到order的metadata裡面去
        
        await paymentModuleService.updatePaymentSession(
            {
                id:paymentSessionID,
                currency_code:thePayment.currency_code,
                amount:thePayment.amount,
                metadata:{},
                data:{
                    type: data.PaymentType,
                    rtn_code: data.RtnCode,
                    amount: data.amount,
                    payment_type: data.PaymentType,
                    payment_status: data.RtnCode,
                    merchant_trade_no: data.MerchantTradeNo,
                    trade_no: data.TradeNo,
                    credit_refund_id:data.gwsr,
                    status: "authorized"
                },
            }
        )

        console.log(action,"excute capturePaymentWorkflow, paymentID:",thePayment.id)


        await updateOrderWorkflow(req.scope).run({
            input:{
                id: orderID,
                user_id: handler,
                metadata:{
                    payment_source: "ecpay",
                    payment_type: data.PaymentType,
                    payment_code: data.RtnCode,
                    payment_msg: data.RtnMsg,
                    payment_status: data.RtnCode === "1" ? "success" : "failed",
                    payment_amount: data.amount,
                    merchant_trade_no: data.MerchantTradeNo,
                    trade_no: data.TradeNo,
                    credit_refund_id:data.gwsr,
                }
            }
        })

        if (data.RtnCode === "1"){
            await capturePaymentWorkflow(req.scope).run({
                input: {
                    payment_id: thePayment.id,
                    amount: data.amount
                },
            })
        }else{
            await cancelOrderWorkflow(req.scope).run({
                input:{
                    order_id: orderID,
                    canceled_by: handler,
                }
            })
        }

    } catch (error) {
        console.error(action,"Error parsing request body:", error)
        res.status(400).send("0|Error")
        return
    }
    
    res.status(200).send("1|OK")
}

export { ecpayCallBack }