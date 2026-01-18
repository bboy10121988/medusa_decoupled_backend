import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function verifyRegions({ container }: ExecArgs) {
    const regionModuleService = container.resolve(Modules.REGION);

    console.log("🚀 Verifying Regions in DB...");
    const regions = await regionModuleService.listRegions();

    if (regions.length === 0) {
        console.log("❌ No regions found!");
    } else {
        console.log(`✅ Found ${regions.length} regions:`);
        regions.forEach(r => {
            console.log(`   - ID: ${r.id}, Name: ${r.name}, Currency: ${r.currency_code}`);
            console.log(`     Countries: ${r.countries?.map(c => c.iso_2).join(', ')}`);
        });
    }
}
