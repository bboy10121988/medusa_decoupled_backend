import { model } from "@medusajs/framework/utils"
import { Affiliate } from "./affiliate"
import { AffiliateLink } from "./affiliate-link"

export const AffiliateConversion = model.define("affiliate_conversion", {
  id: model.id().primaryKey(),
  order_id: model.text().nullable(), // ID of the order in Medusa (if applicable)
  amount: model.bigNumber().default(0), // Order value
  commission: model.bigNumber().default(0), // Commission amount
  status: model.enum(["pending", "confirmed", "cancelled"]).default("pending"),
  metadata: model.json().nullable(),
  affiliate_id: model.text(),
  affiliate: model.belongsTo(() => Affiliate, { mappedBy: "conversions" }),
  link: model.belongsTo(() => AffiliateLink, { mappedBy: "conversions_details" }),
})
