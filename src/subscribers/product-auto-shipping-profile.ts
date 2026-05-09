import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

/**
 * 自動為新商品分配預設 shipping profile
 * 防止忘記設定導致結帳失敗
 */
export default async function productAutoShippingProfile({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  try {
    // 檢查商品是否已有 shipping profile
    const { data: [product] } = await query.graph({
      entity: "product",
      fields: ["id", "title", "shipping_profile.*"],
      filters: { id: data.id },
    })

    if (!product) return

    // 如果已經有 shipping profile，跳過
    if (product.shipping_profile) {
      return
    }

    // 取得預設 shipping profile
    const { data: profiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id", "name", "type"],
      filters: { type: "default" },
    })

    if (!profiles || profiles.length === 0) {
      logger.warn(`[AutoShippingProfile] No default shipping profile found`)
      return
    }

    const defaultProfile = profiles[0]

    // 用 remote link 關聯商品和 shipping profile
    const remoteLink = container.resolve("remoteLink")
    const { Modules } = await import("@medusajs/framework/utils")

    await remoteLink.create({
      [Modules.PRODUCT]: { product_id: data.id },
      [Modules.FULFILLMENT]: { shipping_profile_id: defaultProfile.id },
    })

    logger.info(`[AutoShippingProfile] Assigned "${defaultProfile.name}" to product "${product.title}"`)
  } catch (error: any) {
    // 如果已存在就忽略（duplicate key）
    if (error?.message?.includes("duplicate") || error?.code === "23505") {
      return
    }
    logger.error(`[AutoShippingProfile] Error: ${error?.message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["product.created"],
}
