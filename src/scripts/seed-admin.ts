import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function seedAdminUsers({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  
  logger.info("Admin users should be created manually through CLI or admin panel");
  logger.info("Use: yarn medusa user create --email <email> --password <password>");
  
  return;
}
