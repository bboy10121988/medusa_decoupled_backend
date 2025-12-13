import { model } from "@medusajs/framework/utils"
// import { Affiliate } from "./affiliate"

export const AffiliateSettlement = model.define("affiliate_settlement", {
  id: model.id().primaryKey(),
  amount: model.bigNumber().default(0),
  currency_code: model.text(),
  status: model.enum(["pending", "processing", "paid", "failed"]).default("pending"),
  period_start: model.dateTime().nullable(),
  period_end: model.dateTime().nullable(),
  metadata: model.json().nullable(),
  // affiliate: model.belongsTo(() => Affiliate, { mappedBy: "settlements" }),
  affiliate_id: model.text(),
})
