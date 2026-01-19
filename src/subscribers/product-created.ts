import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * Product Created Subscriber
 * Triggers DeepL translation and creates Sanity documents for EN/JP.
 */
export default async function productCreateHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log(`[ProductSync] Processing product created: ${data.id}`)

  // Use setImmediate to avoid blocking the main thread
  setImmediate(async () => {
    const query = container.resolve("query")

    try {
      // 1. Fetch Product Data from Medusa
      const { data: [product] } = await query.graph({
        entity: "product",
        fields: ["*", "options.*", "variants.*"],
        filters: { id: data.id },
      })

      if (!product) {
        console.error(`[ProductSync] Product ${data.id} not found`)
        return
      }

      console.log(`[ProductSync] Found product: ${product.title}. Syncing to Sanity (ZH-TW only)...`)

      // 2. Prepare Sanity Config
      const SANITY_TOKEN = process.env.SANITY_API_TOKEN
      const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || 'm7o2mv1n'
      const SANITY_DATASET = process.env.SANITY_DATASET || 'production'

      if (!SANITY_TOKEN) {
        console.error('[ProductSync] Missing SANITY_API_TOKEN. Skipping sync.')
        return
      }

      // 3. Push to Sanity (Create only ZH-TW document)
      // The Sanity Webhook will detect this creation/update and handle EN/JP translations automatically.

      const sanityMutations = [
        // ZH-TW (Source of Truth)
        {
          createOrReplace: {
            _id: `product-${product.id}`,
            _type: 'product',
            language: 'zh-TW',
            title: product.title,
            description: product.description,
            // Assuming handle is unique enough or we might want to map slug? 
            slug: { current: product.handle },
            medusaId: product.id,
            // Add other fields as needed (images, options, etc.)
            // Note: Images need asset uploads which is complex here. 
            // For now, syncing text basics.
          }
        }
      ]

      console.log('[ProductSync] Sending mutations to Sanity...')
      const sanityRes = await fetch(`https://${SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/mutate/${SANITY_DATASET}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SANITY_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mutations: sanityMutations })
      })

      if (sanityRes.ok) {
        console.log('[ProductSync] Successfully synced ZH-TW to Sanity! (Webhook will handle translation)')
      } else {
        const err = await sanityRes.text()
        console.error('[ProductSync] Sanity Sync Failed:', err)
      }

    } catch (error) {
      console.error('[ProductSync] Handler Error:', error)
    }
  })
}

export const config: SubscriberConfig = {
  event: "product.created",
}