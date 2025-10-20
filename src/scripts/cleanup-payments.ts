import { ExecArgs } from "@medusajs/framework/types"

/**
 * 清理無效的 Payment 記錄
 * 修復 "Payment with id xxx not found" 錯誤
 */
export default async function cleanupInvalidPayments({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve("query")

  try {
    logger.info("🔍 開始檢查無效的 Payment 記錄...")

    // 查找所有訂單及其關聯的 payments
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "payments.*"],
    })

    logger.info(`📊 找到 ${orders.length} 個訂單`)

    let invalidPaymentCount = 0
    
    for (const order of orders) {
      const orderWithPayments = order as any
      if (orderWithPayments.payments && orderWithPayments.payments.length > 0) {
        for (const payment of orderWithPayments.payments) {
          // 檢查 payment 是否有效
          if (!payment || !payment.id) {
            invalidPaymentCount++
            logger.warn(`⚠️ 發現無效的 payment 在訂單 ${order.id}`)
          }
        }
      }
    }

    if (invalidPaymentCount === 0) {
      logger.info("✅ 沒有發現無效的 Payment 記錄")
    } else {
      logger.info(`🔧 發現 ${invalidPaymentCount} 個無效的 Payment 記錄`)
      logger.info("建議手動清理這些記錄或聯繫技術支援")
    }

    // 檢查特定的 Payment ID (如果在環境變數中指定)
    const problematicPaymentId = process.env.CHECK_PAYMENT_ID || "pay_01K6YNDWH90JBY1RDXWT1AGBA6"
    
    try {
      const { data: specificPayments } = await query.graph({
        entity: "payment",
        fields: ["id", "amount", "currency_code", "status"],
        filters: { id: problematicPaymentId }
      })

      if (specificPayments.length === 0) {
        logger.warn(`❌ Payment ID ${problematicPaymentId} 不存在於資料庫中`)
        logger.info("這可能是舊的或已刪除的 payment 記錄引起的快取問題")
      } else {
        logger.info(`✅ Payment ID ${problematicPaymentId} 存在且狀態正常`)
      }
    } catch (error) {
      logger.error(`❌ 檢查 Payment ID ${problematicPaymentId} 時發生錯誤:`, error.message)
    }

  } catch (error) {
    logger.error("❌ 清理 Payment 記錄時發生錯誤:", error)
  }
}