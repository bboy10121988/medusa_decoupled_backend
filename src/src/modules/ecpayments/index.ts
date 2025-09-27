
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ECPayCreditProviderService from "./ecpaycreditproviderservice"

export default ModuleProvider(Modules.PAYMENT, {
  services: [ECPayCreditProviderService],
})