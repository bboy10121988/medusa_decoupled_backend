import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// 匯率設定 (基於 TWD)
const EXCHANGE_RATES = {
    TWD_TO_USD: 0.031,  // 1 TWD ≈ 0.031 USD
    TWD_TO_JPY: 4.7,    // 1 TWD ≈ 4.7 JPY
};

export default async function addMultiCurrencyPrices({ container }: ExecArgs) {
    const productService = container.resolve(Modules.PRODUCT);
    const pricingService = container.resolve(Modules.PRICING);
    const regionService = container.resolve(Modules.REGION);
    const linkService = container.resolve("remoteLink");

    console.log("💰 Starting multi-currency price setup...\n");

    // 1. 獲取所有地區
    const regions = await regionService.listRegions();
    console.log("📍 Regions found:", regions.map(r => `${r.name} (${r.currency_code})`).join(", "));

    const usdRegion = regions.find(r => r.currency_code === 'usd');
    const jpyRegion = regions.find(r => r.currency_code === 'jpy');

    console.log(`📍 USD Region ID: ${usdRegion?.id || 'NOT FOUND'}`);
    console.log(`📍 JPY Region ID: ${jpyRegion?.id || 'NOT FOUND'}`);

    // 2. 獲取所有產品和變體
    const [products] = await productService.listAndCountProducts({}, {
        relations: ["variants", "variants.options"],
        take: 100
    });

    console.log(`\n📦 Found ${products.length} products\n`);

    // 3. 查詢所有價格集
    const [allPriceSets] = await pricingService.listAndCountPriceSets({}, {
        relations: ["prices"],
        take: 1000
    });

    console.log(`💵 Found ${allPriceSets.length} price sets\n`);

    // 4. 查詢變體到價格集的連結
    const query = container.resolve("query");

    for (const product of products) {
        console.log(`\n🔧 Processing: ${product.title}`);

        if (!product.variants || product.variants.length === 0) {
            console.log("   ⏭️ No variants, skipping");
            continue;
        }

        for (const variant of product.variants) {
            try {
                // 使用 Query 獲取變體的價格資訊
                const { data: variantData } = await query.graph({
                    entity: "product_variant",
                    fields: ["id", "title", "price_set.*", "price_set.prices.*"],
                    filters: { id: variant.id }
                });

                if (!variantData || variantData.length === 0) {
                    console.log(`   ⚠️ No variant data for ${variant.id}`);
                    continue;
                }

                const variantInfo = variantData[0];
                const priceSet = variantInfo.price_set;

                if (!priceSet) {
                    console.log(`   ⚠️ No price set linked to variant ${variant.id}`);
                    continue;
                }

                console.log(`   📍 Price Set ID: ${priceSet.id}`);
                const existingPrices = priceSet.prices || [];
                console.log(`   💵 Existing prices: ${existingPrices.map((p: any) => `${p.currency_code}: ${p.amount}`).join(", ")}`);

                // 找到 TWD 價格作為基準
                const twdPrice = existingPrices.find((p: any) => p.currency_code === 'twd');
                if (!twdPrice) {
                    console.log(`   ⚠️ No TWD price found, skipping`);
                    continue;
                }

                const twdAmount = twdPrice.amount;

                // 檢查是否需要添加 USD 價格
                const hasUsd = existingPrices.some((p: any) => p.currency_code === 'usd');
                if (!hasUsd && usdRegion) {
                    const usdAmount = Math.round(twdAmount * EXCHANGE_RATES.TWD_TO_USD * 100); // 轉換為分
                    await pricingService.addPrices({
                        priceSetId: priceSet.id,
                        prices: [{
                            amount: usdAmount,
                            currency_code: "usd",
                            rules: { region_id: usdRegion.id }
                        }]
                    });
                    console.log(`   ✅ Added USD price: ${usdAmount / 100}`);
                } else {
                    console.log(`   ℹ️ USD price already exists`);
                }

                // 檢查是否需要添加 JPY 價格
                const hasJpy = existingPrices.some((p: any) => p.currency_code === 'jpy');
                if (!hasJpy && jpyRegion) {
                    const jpyAmount = Math.round(twdAmount * EXCHANGE_RATES.TWD_TO_JPY); // JPY 沒有小數
                    await pricingService.addPrices({
                        priceSetId: priceSet.id,
                        prices: [{
                            amount: jpyAmount,
                            currency_code: "jpy",
                            rules: { region_id: jpyRegion.id }
                        }]
                    });
                    console.log(`   ✅ Added JPY price: ${jpyAmount}`);
                } else {
                    console.log(`   ℹ️ JPY price already exists`);
                }

            } catch (error: any) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
    }

    console.log(`\n\n✅ Completed!`);
}
