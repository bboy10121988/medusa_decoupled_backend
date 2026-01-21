import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260121_AddPromoCodeFields extends Migration {
    override async up(): Promise<void> {
        this.addSql(`ALTER TABLE "affiliate_conversion" ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT 'link';`);
        this.addSql(`ALTER TABLE "affiliate_conversion" ADD COLUMN IF NOT EXISTS "promo_code" text NULL;`);
    }

    override async down(): Promise<void> {
        this.addSql(`ALTER TABLE "affiliate_conversion" DROP COLUMN IF EXISTS "source_type";`);
        this.addSql(`ALTER TABLE "affiliate_conversion" DROP COLUMN IF EXISTS "promo_code";`);
    }
}
