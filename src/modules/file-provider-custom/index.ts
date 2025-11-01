import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import CustomFileProviderService from "./service.js"

export default ModuleProvider(Modules.FILE, {
  services: [CustomFileProviderService],
})
