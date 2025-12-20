import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251215211500 extends Migration {

    override async up(): Promise<void> {
        this.addSql(`ALTER TABLE "affiliate" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user';`);
    }

    override async down(): Promise<void> {
        this.addSql(`ALTER TABLE "affiliate" DROP COLUMN IF EXISTS "role";`);
    }

}
