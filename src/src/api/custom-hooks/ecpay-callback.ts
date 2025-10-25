import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { IncomingForm } from 'formidable'
import { Readable } from 'stream'
import * as querystring from 'querystring'
import { completeCartWorkflow,markPaymentCollectionAsPaid,capturePaymentWorkflow,cancelOrderWorkflow,updateOrderWorkflow } from "@medusajs/medusa/core-flows"
import { ConstraintViolationException, t } from "@mikro-orm/core"
import { resourceLimits } from "worker_threads"

// Define strong type interface for ECPay callback
interface EcpayCallbackBody {
    MerchantID?: string
    MerchantTradeNo?: string
    StoreID?: string
    RtnCode?: string
    RtnMsg?: string
    TradeNo?: string
    TradeAmt?: string
    PaymentDate?: string
    PaymentType?: string
    PaymentTypeChargeFee?: string
    TradeDate?: string
    PlatformID?: string
    SimulatePaid?: string
    CustomField1?: string
    CustomField2?: string
    CustomField3?: string
    CustomField4?: string
    CheckMacValue?: string
}

const ecpayCallBack = async (req: MedusaRequest, res: MedusaResponse,next: MedusaNextFunction) => {
    
    const action: string = "ecpayCallBack"
    
    try {
        const body = req.body

        if (!body) {
            throw new Error("Request body is empty")
        }

        const data = body as EcpayCallbackBody
        let cartID: string = ""

        if (!data.CustomField4){
            throw new Error("CustomField4 (cart_id) is missing")
        }else{
            cartID = data.CustomField4
        }


        
        
        const { result } = await completeCartWorkflow(req.scope).run({
            input: { id:cartID }, // 只需要 cart 的 ID
        })

        console.log(action,"excute completeCartWorkflow, and get orderID result:",result)

        const orderID = result.id

        // 正確：直接拿到 query 實例，呼叫 graph
        const query = req.scope.resolve("query")

        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "payment_collections.id"],
            filters: { id: orderID },
        })

        console.log(action,"get order by orderID, orders:",orders)

        const theOrder = orders?.[0]

        console.log(action,"theOrder:",theOrder)

        if (!theOrder){
            throw new Error("Order not found for orderID: " + orderID)
        }

        

        const thePaymentCollections = theOrder?.payment_collections

        console.log(action,"get paymentCollections by orderID, paymentCollections:",thePaymentCollections)

        const paymentCollectionID = thePaymentCollections?.[0]?.id

        if (!paymentCollectionID){
            res.status(200).send("1|OK")
            return
        }

        const { data: paymentCollections } = await query.graph({
            entity: "payment_collection",
            fields: ["id", "payments.id"],
            filters: { id: paymentCollectionID },
        })

        const thePaymentCollection = paymentCollections?.[0]

        console.log(action,"thePaymentCollection:",thePaymentCollection)

        const thePayments = thePaymentCollection?.payments

        console.log(action,"thePaymens:",thePayments)

        const thePayment = thePayments?.[0]

        console.log(action,"thePayment:",thePayment)

        const paymentID = thePayment?.id

        console.log(action,"paymentID",paymentID)

        if (paymentID){

            let theMetadata = {
                payment_type: "ecpayment",
                payment_code: data.RtnCode,
                payment_msg: data.RtnMsg,
                payment_status: "unknown",
            }

            if (data.RtnCode === "1"){
                console.log(action,"excute capturePaymentWorkflow, paymentID:",paymentID)
                await capturePaymentWorkflow(req.scope).run({
                        input: {
                        payment_id: paymentID,
                        amount: data.TradeAmt ? parseInt(data.TradeAmt) : undefined,
                    },
                })
                theMetadata.payment_status = "success"
            }else{
                theMetadata.payment_status = "failed"
            }

            console.log(action,"excute cancelOrderWorkflow, paymentID:",paymentID)
            await updateOrderWorkflow(req.scope).run({
                input:{
                    id: orderID,
                    user_id: "ecpayment callback",
                    metadata:theMetadata
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