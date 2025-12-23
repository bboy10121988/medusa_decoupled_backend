import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { AFFILIATE_MODULE } from "../modules/affiliate"
import AffiliateService from "../modules/affiliate/service"

/**
 * 處理訂單取消時的聯盟佣金撤回
 */
export default async function affiliateOrderCanceled({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const affiliateService: AffiliateService = container.resolve(AFFILIATE_MODULE)

    try {
        // 撤回該訂單對應的佣金
        await affiliateService.cancelConversion(data.id, "order_canceled")
        console.log(`[Affiliate] Commission revoked for canceled order: ${data.id}`)
    } catch (error) {
        console.error("❌ Error revoking affiliate commission on cancellation:", error)
    }
}

export const config: SubscriberConfig = {
    event: "order.canceled",
}
