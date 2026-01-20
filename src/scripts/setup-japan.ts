import { ExecArgs } from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    Modules,
} from "@medusajs/framework/utils";
import {
    createRegionsWorkflow,
    updateRegionsWorkflow,
    updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function setupJapan({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const regionService = container.resolve(Modules.REGION);
    const storeModuleService = container.resolve(Modules.STORE);

    logger.info("Starting Japan configuration setup...");

    // 1. Update Store to support JPY
    const [store] = await storeModuleService.listStores();
    logger.info("Overwriting store currencies with: TWD (default), USD, JPY");

    const targetCurrencies = [
        { currency_code: 'twd', is_default: true },
        { currency_code: 'usd', is_default: false },
        { currency_code: 'jpy', is_default: false }
    ];

    try {
        await updateStoresWorkflow(container).run({
            input: {
                selector: { id: store.id },
                update: {
                    supported_currencies: targetCurrencies,
                },
            },
        });
        logger.info("Store currencies updated.");
    } catch (e) {
        logger.error(`Failed to update store currencies: ${e.message}`);
    }

    // 2. Handle Regions
    // Find region containing 'jp'
    const regions = await regionService.listRegions({}, {
        relations: ["countries"]
    });

    // Filter in memory for regions containing JP
    const regionsWithJp = regions.filter(r => r.countries?.some(c => c.iso_2 === 'jp'));

    if (regionsWithJp.length) {
        logger.info(`Found existing region(s) containing Japan: ${regionsWithJp.map(r => r.name).join(', ')}`);

        for (const region of regionsWithJp) {
            if (region.currency_code === 'jpy') {
                logger.info(`Region '${region.name}' already uses JPY. Skipping region creation.`);
                // Assuming if it exists and uses JPY, we are good.
                return;
            }

            // If region exists but not JPY (e.g. Asia with TWD), we need to remove JP from it.
            logger.info(`Removing Japan from region '${region.name}'...`);
            const remainingCountries = region.countries
                .filter(c => c.iso_2 !== 'jp')
                .map(c => c.iso_2);

            await updateRegionsWorkflow(container).run({
                input: {
                    selector: { id: region.id },
                    update: {
                        countries: remainingCountries
                    }
                }
            });
        }
    }

    // 3. Create Japan Region
    logger.info("Creating dedicated Japan region with JPY...");
    try {
        const { result } = await createRegionsWorkflow(container).run({
            input: {
                regions: [
                    {
                        name: "Japan",
                        currency_code: "jpy",
                        countries: ["jp"],
                        payment_providers: ["pp_system_default"],
                    },
                ],
            },
        });
        logger.info(`Japan region created with ID: ${result[0].id}`);
    } catch (e) {
        logger.error(`Failed to create Japan region: ${e.message}`);
    }

    logger.info("Japan setup complete.");
}
