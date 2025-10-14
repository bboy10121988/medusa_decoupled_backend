import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import {
  sendNotificationsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"

type WorkflowInput = {
  id: string
  email?: string
  template: string
}

/**
 * 電子郵件發送工作流程
 * 可用於發送各種類型的電子郵件通知
 */
export const sendEmailWorkflow = createWorkflow(
  "send-email-workflow",
  ({ id, email, template }: WorkflowInput) => {
    
    // 根據不同的範本類型查詢不同的資料
    let entityData
    
    if (template === "product-created") {
      entityData = useQueryGraphStep({
        entity: "product",
        fields: [
          "*",
          "images.*",
        ],
        filters: {
          id,
        },
      })
    } else if (template === "order-confirmation") {
      entityData = useQueryGraphStep({
        entity: "order",
        fields: [
          "*",
          "customer.*",
          "items.*",
          "items.product.*",
          "shipping_address.*",
          "billing_address.*"
        ],
        filters: {
          id,
        },
      })
    }

    const { data } = entityData || { data: [] }

    // 根據範本類型準備不同的資料
    const emailData = (() => {
      if (template === "product-created" && data[0]) {
        const product = data[0]
        return {
          to: email || "admin@timsfantasyworld.com",
          channel: "email" as const,
          template: "product-created",
          data: {
            product_title: product.title,
            product_description: product.description,
            product_image: product.images?.[0]?.url || '',
            product_url: `${process.env.FRONTEND_URL || 'https://timsfantasyworld.com'}/products/${product.handle}`,
            admin_url: `${process.env.MEDUSA_ADMIN_BACKEND_URL || 'https://admin.timsfantasyworld.com'}/products/${product.id}`,
          },
        }
      } else if (template === "order-confirmation" && data[0]) {
        const order = data[0]
        const items = order.items?.filter((item: any) => item !== null).map((item: any) => ({
          title: item.product?.title || item.title || '未知商品',
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total: (item.unit_price || 0) * (item.quantity || 0)
        })) || []

        return {
          to: email || order.customer?.email,
          channel: "email" as const,
          template: "order-confirmation",
          data: {
            customer_name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || order.customer?.email,
            order_id: order.id,
            order_date: new Date().toLocaleDateString('zh-TW'),
            total_amount: order.total || 0,
            currency: order.currency_code?.toUpperCase() || 'TWD',
            items: items,
            shipping_address: order.shipping_address ? {
              company: order.shipping_address.company,
              first_name: order.shipping_address.first_name,
              last_name: order.shipping_address.last_name,
              address_1: order.shipping_address.address_1,
              address_2: order.shipping_address.address_2,
              city: order.shipping_address.city,
              country_code: order.shipping_address.country_code,
              postal_code: order.shipping_address.postal_code,
            } : null,
            store_name: "Tim's Fantasy World",
            store_url: process.env.FRONTEND_URL || 'https://timsfantasyworld.com',
            order_url: `${process.env.FRONTEND_URL || 'https://timsfantasyworld.com'}/account/orders/${order.id}`,
          },
        }
      }
      
      // 預設情況
      return {
        to: email || "admin@timsfantasyworld.com",
        channel: "email" as const,
        template: template,
        data: {
          message: "這是一個測試通知",
          timestamp: new Date().toISOString(),
        },
      }
    })()

    sendNotificationsStep([emailData])
  }
)