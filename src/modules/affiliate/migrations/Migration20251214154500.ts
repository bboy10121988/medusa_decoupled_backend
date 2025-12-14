import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251214154500 extends Migration {

    override async up(): Promise<void> {
        // 1. Add commission_rate to affiliate table
        this.addSql(`ALTER TABLE "affiliate" ADD COLUMN IF NOT EXISTS "commission_rate" real DEFAULT 0.1;`);

        // 2. Create affiliate_settlement table if it doesn't exist
        this.addSql(`create table if not exists "affiliate_settlement" ("id" text not null, "amount" numeric not null default 0, "currency_code" text not null, "status" text check ("status" in ('pending', 'processing', 'paid', 'failed')) not null default 'pending', "period_start" timestamptz null, "period_end" timestamptz null, "metadata" jsonb null, "affiliate_id" text not null, "raw_amount" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_settlement_pkey" primary key ("id"));`);

        // 3. Add indices for affiliate_settlement
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_settlement_affiliate_id" ON "affiliate_settlement" (affiliate_id) WHERE deleted_at IS NULL;`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_settlement_deleted_at" ON "affiliate_settlement" (deleted_at) WHERE deleted_at IS NULL;`);
    }

    override async down(): Promise<void> {
        this.addSql(`ALTER TABLE "affiliate" DROP COLUMN IF EXISTS "commission_rate";`);
        this.addSql(`DROP TABLE IF EXISTS "affiliate_settlement";`);
    }

}
