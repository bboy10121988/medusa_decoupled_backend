import { model } from "@medusajs/framework/utils"
import { AffiliateLink } from "./affiliate-link"
import { AffiliateClick } from "./affiliate-click"
import { AffiliateConversion } from "./affiliate-conversion"
// import { AffiliateSettlement } from "./affiliate-settlement"

export const Affiliate = model.define("affiliate", {
  id: model.id().primaryKey(),
  email: model.text().unique(),
  password_hash: model.text().nullable(), // For simple email/pass auth
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  phone: model.text().nullable(),
  code: model.text().unique(), // The main referral code for the affiliate
  balance: model.bigNumber().default(0),
  total_earnings: model.bigNumber().default(0),
  status: model.enum(["pending", "active", "rejected", "suspended"]).default("pending"),
  settings: model.json().default({}), // Stores payment info, notification prefs
  metadata: model.json().nullable(),
  links: model.hasMany(() => AffiliateLink, { mappedBy: "affiliate" }),
  clicks: model.hasMany(() => AffiliateClick, { mappedBy: "affiliate" }),
  conversions: model.hasMany(() => AffiliateConversion, { mappedBy: "affiliate" }),
  // settlements: model.hasMany(() => AffiliateSettlement, { mappedBy: "affiliate" }),
  commission_rate: model.float().default(0.1), // Commission rate (e.g., 0.1 for 10%)
  role: model.enum(["user", "admin"]).default("user"),
})
