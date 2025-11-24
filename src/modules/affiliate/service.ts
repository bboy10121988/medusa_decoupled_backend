import { MedusaService } from "@medusajs/framework/utils"
import { Affiliate } from "./models/affiliate"
import { AffiliateLink } from "./models/affiliate-link"
import { AffiliateClick } from "./models/affiliate-click"
import { AffiliateConversion } from "./models/affiliate-conversion"
import { AffiliateSettlement } from "./models/affiliate-settlement"

class AffiliateService extends MedusaService({
  Affiliate,
  AffiliateLink,
  AffiliateClick,
  AffiliateConversion,
  AffiliateSettlement,
}) {
  // Custom methods can be added here
}

export default AffiliateService
