import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { Modules,} from "@medusajs/framework/utils"
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows"

interface EcpayCallbackBody {
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

const ecpayCallBack = async (req: MedusaRequest, res: MedusaResponse,next: MedusaNextFunction) => {
    
    const action: string = "ecpayCallBack"
    
    try {
        const body = req.body

        if (!body) {
            throw new Error("Request body is empty")
        }

        const data = body as EcpayCallbackBody


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

        if (data.RtnCode !== 1){
            throw new Error("Unhandled RtnCode: " + data.RtnCode)
        }
        
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

        await paymentModuleService.updatePaymentSession(
            {
                id:paymentSessionID,
                currency_code:thePayment.currency_code,
                amount:thePayment.amount,
                data:{
                    payment_type: data.PaymentType,
                    payment_status: data.RtnCode,
                    merchant_trade_no: data.MerchantTradeNo,
                    trade_no: data.TradeNo,
                    credit_refund_id:data.gwsr
                },
            }
        )

        console.log(action,"excute capturePaymentWorkflow, paymentID:",thePayment.id)

        await capturePaymentWorkflow(req.scope).run({
            input: {
                payment_id: thePayment.id,
            },
        })

    } catch (error) {
        console.error(action,"Error parsing request body:", error)
        res.status(400).send("0|Error")
        return
    }
    
    res.status(200).send("1|OK")
}

export { ecpayCallBack }