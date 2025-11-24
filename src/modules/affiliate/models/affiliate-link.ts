import { model } from "@medusajs/framework/utils"
import { Affiliate } from "./affiliate"
import { AffiliateClick } from "./affiliate-click"
import { AffiliateConversion } from "./affiliate-conversion"

export const AffiliateLink = model.define("affiliate_link", {
  id: model.id().primaryKey(),
  url: model.text(), // The target URL
  code: model.text().unique(), // Unique short code for this specific link
  clicks: model.number().default(0),
  conversions: model.number().default(0),
  metadata: model.json().nullable(),
  affiliate: model.belongsTo(() => Affiliate, { mappedBy: "links" }),
  clicks_details: model.hasMany(() => AffiliateClick, { mappedBy: "link" }),
  conversions_details: model.hasMany(() => AffiliateConversion, { mappedBy: "link" }),
})
