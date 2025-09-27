import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  updateStoresWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function setupTaiwanStore({ container }: any) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const storeModuleService = container.resolve(Modules.STORE);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

  logger.info("Setting up Taiwan store configuration...");

  // 更新商店資訊
  const [store] = await storeModuleService.listStores();
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "台灣商店",
      },
    },
  });
  logger.info("Updated store name");

  // 創建台灣地區
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "台灣地區",
          currency_code: "TWD",
          countries: ["TW"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  logger.info("Created Taiwan region with TWD currency");

  // 創建台灣銷售渠道
  const { result: salesChannelResult } = await createSalesChannelsWorkflow(
    container
  ).run({
    input: {
      salesChannelsData: [
        {
          name: "台灣銷售渠道",
          description: "台灣市場專用銷售渠道",
        },
      ],
    },
  });
  logger.info("Created Taiwan sales channel");

  // 創建台灣倉庫
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "台灣倉庫",
          address: {
            address_1: "台北市信義區",
            city: "台北市",
            country_code: "TW",
            postal_code: "110",
          },
        },
      ],
    },
  });
  logger.info("Created Taiwan stock location");

  // 連結銷售渠道和倉庫
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocationResult[0].id,
      add: [salesChannelResult[0].id],
    },
  });
  logger.info("Linked Taiwan sales channel to Taiwan stock location");

  logger.info("Taiwan store setup completed successfully!");
}
