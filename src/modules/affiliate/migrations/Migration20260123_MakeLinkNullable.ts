import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260123_MakeLinkNullable extends Migration {
    override async up(): Promise<void> {
        // Make link_id column nullable for promo_code source conversions
        this.addSql(`ALTER TABLE "affiliate_conversion" ALTER COLUMN "link_id" DROP NOT NULL;`);
    }

    override async down(): Promise<void> {
        // Note: This might fail if there are existing rows with null link_id
        this.addSql(`ALTER TABLE "affiliate_conversion" ALTER COLUMN "link_id" SET NOT NULL;`);
    }
}
