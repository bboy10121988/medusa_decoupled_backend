import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createRegionsWorkflow } from "@medusajs/medusa/core-flows";

export default async function seedRegions({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const regionModuleService = container.resolve(Modules.REGION);
    const storeModuleService = container.resolve(Modules.STORE);

    logger.info("🚀 Starting Region Seeding (JP & US)...");

    // 1. Check if regions already exist
    const existingRegions = await regionModuleService.listRegions();
    const existingCountryCodes = new Set(
        existingRegions.flatMap((r) => r.countries?.map((c) => c.iso_2))
    );

    logger.info(`📋 Existing regions: ${existingRegions.map((r) => `${r.name} (${r.currency_code})`).join(", ")}`);

    const regionsToCreate: any[] = [];

    // Japan
    if (!existingCountryCodes.has("jp")) {
        logger.info("➕ Queueing Japan Region...");
        regionsToCreate.push({
            name: "Japan",
            currency_code: "jpy",
            countries: ["jp"],
            payment_providers: ["pp_system_default"],
        });
    } else {
        logger.info("⚠️ Japan region (or country 'jp') already exists. Skipping.");
    }

    // United States
    if (!existingCountryCodes.has("us")) {
        logger.info("➕ Queueing United States Region...");
        regionsToCreate.push({
            name: "United States",
            currency_code: "usd",
            countries: ["us"],
            payment_providers: ["pp_system_default"],
        });
    } else {
        logger.info("⚠️ United States region (or country 'us') already exists. Skipping.");
    }

    if (regionsToCreate.length === 0) {
        logger.info("✅ All regions already exist. No action needed.");
        return;
    }

    // 2. Execute Workflow
    try {
        const { result } = await createRegionsWorkflow(container).run({
            input: {
                regions: regionsToCreate,
            },
        });

        result.forEach((r) => {
            logger.info(`✅ Successfully created region: ${r.name} (${r.currency_code})`);
        });
    } catch (error) {
        logger.error(`❌ Failed to create regions: ${error.message}`);
        console.error(error);
    }

    logger.info("✨ Region seeding finished.");
}
