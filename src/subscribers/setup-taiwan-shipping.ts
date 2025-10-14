import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * 台灣地區配送設置檢查器
 * 檢查並創建必要的配送設置
 */
export default async function setupTaiwanShippingHandler({
  event: { data },
  container,
}: SubscriberArgs<{}>) {
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const logger = container.resolve("logger")

  try {
    logger.info("檢查台灣配送設置...")

    // 檢查是否已有台灣配送區域
    const existingServiceZones = await fulfillmentModuleService.listServiceZones({
      name: "Taiwan"
    })

    if (existingServiceZones.length > 0) {
      logger.info("台灣配送區域已存在")
      return
    }

    logger.info("創建台灣配送設置...")

    // 創建台灣配送設定
    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Taiwan delivery",
      type: "shipping", 
      service_zones: [
        {
          name: "Taiwan",
          geo_zones: [
            {
              country_code: "tw",
              type: "country",
            },
          ],
        },
      ],
    })

    logger.info(`✅ 台灣配送設置已創建: ${fulfillmentSet.id}`)

  } catch (error) {
    logger.error("❌ 台灣配送設置失敗:", error)
  }
}

export const config: SubscriberConfig = {
  event: "store.updated", // 當商店更新時觸發檢查
}