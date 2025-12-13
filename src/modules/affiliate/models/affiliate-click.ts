import { model } from "@medusajs/framework/utils"
import { Affiliate } from "./affiliate"
import { AffiliateLink } from "./affiliate-link"

export const AffiliateClick = model.define("affiliate_click", {
  id: model.id().primaryKey(),
  ip: model.text().nullable(),
  user_agent: model.text().nullable(),
  metadata: model.json().nullable(),
  affiliate_id: model.text(),
  affiliate: model.belongsTo(() => Affiliate, { mappedBy: "clicks" }),
  link: model.belongsTo(() => AffiliateLink, { mappedBy: "clicks_details" }),
})
