import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function listProductPrices({ container }: ExecArgs) {
    const productService = container.resolve(Modules.PRODUCT);
    const pricingService = container.resolve(Modules.PRICING);

    console.log("🔍 Fetching products and their prices...\n");

    // 獲取所有產品
    const [products] = await productService.listAndCountProducts({}, {
        relations: ["variants"],
        take: 100
    });

    console.log(`Found ${products.length} products\n`);

    for (const product of products) {
        console.log(`\n📦 Product: ${product.title} (${product.id})`);

        if (!product.variants || product.variants.length === 0) {
            console.log("   No variants");
            continue;
        }

        for (const variant of product.variants) {
            console.log(`   Variant: ${variant.title || 'Default'} (${variant.id})`);

            // 獲取價格
            try {
                const priceSet = await pricingService.listPriceSets({
                    id: [variant.id]
                });

                if (priceSet && priceSet.length > 0) {
                    console.log(`   Prices: ${JSON.stringify(priceSet[0])}`);
                } else {
                    console.log("   No price set found");
                }
            } catch (e: any) {
                console.log(`   Error getting prices: ${e.message}`);
            }
        }
    }

    console.log("\n✅ Done listing products");
}
