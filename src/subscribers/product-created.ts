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

      console.log(`[ProductSync] Found product: ${product.title}. Starting translation...`)

      // 2. Prepare Translation Config
      const DEEPL_KEY = process.env.DEEPL_API_KEY
      const SANITY_TOKEN = process.env.SANITY_API_TOKEN
      const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || 'm7o2mv1n'
      const SANITY_DATASET = process.env.SANITY_DATASET || 'production'

      if (!DEEPL_KEY || !SANITY_TOKEN) {
        console.error('[ProductSync] Missing DEEPL_API_KEY or SANITY_API_TOKEN. Skipping sync.')
        return
      }

      const DEEPL_URL = DEEPL_KEY.endsWith(':fx')
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate'

      // Helper function for DeepL
      const translate = async (text: string, targetLang: string) => {
        if (!text) return ''
        try {
          const params = new URLSearchParams()
          params.append('auth_key', DEEPL_KEY)
          params.append('text', text)
          params.append('target_lang', targetLang)

          const res = await fetch(DEEPL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
          })
          if (!res.ok) return text
          const json = await res.json()
          return json.translations[0]?.text || text
        } catch (e) {
          console.error('[ProductSync] DeepL error:', e)
          return text
        }
      }

      // 3. Perform Translations
      // Original (TW)
      const titleTW = product.title
      const descTW = product.description

      // Translate to EN
      console.log('[ProductSync] Translating to EN...')
      const titleEN = await translate(titleTW, 'EN-US')
      const descEN = await translate(descTW, 'EN-US')

      // Translate to JP
      console.log('[ProductSync] Translating to JP...')
      const titleJP = await translate(titleTW, 'JA')
      const descJP = await translate(descTW, 'JA')

      // 4. Push to Sanity (Create 3 documents: basic + localized)
      // We create documents with type 'product'.
      // ID Pattern: `product-${handle}` (base), `product-${handle}-en`, `product-${handle}-jp`?
      // Or use Medusa ID?
      // Best practice: Use `medusaId` field to link.
      // ID: `product-${product.id}` (zh-TW), `product-${product.id}__i18n_en`, etc.

      const sanityMutations = [
        // ZH-TW (Default)
        {
          createOrReplace: {
            _id: `product-${product.id}`,
            _type: 'product',
            language: 'zh-TW',
            title: titleTW,
            description: descTW,
            slug: { current: product.handle },
            medusaId: product.id,
          }
        },
        // EN
        {
          createOrReplace: {
            _id: `product-${product.id}__i18n_en`,
            _type: 'product',
            language: 'en',
            title: titleEN,
            description: descEN,
            slug: { current: `${product.handle}-en` },
            medusaId: product.id,
          }
        },
        // JA
        {
          createOrReplace: {
            _id: `product-${product.id}__i18n_ja-jp`,
            _type: 'product',
            language: 'ja-JP',
            title: titleJP,
            description: descJP,
            slug: { current: `${product.handle}-jp` },
            medusaId: product.id,
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
        console.log('[ProductSync] Successfully synced to Sanity!')
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