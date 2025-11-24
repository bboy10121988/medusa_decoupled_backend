import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251124191144 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "affiliate_link" drop constraint if exists "affiliate_link_code_unique";`);
    this.addSql(`alter table if exists "affiliate" drop constraint if exists "affiliate_code_unique";`);
    this.addSql(`alter table if exists "affiliate" drop constraint if exists "affiliate_email_unique";`);
    this.addSql(`create table if not exists "affiliate" ("id" text not null, "email" text not null, "password_hash" text null, "first_name" text null, "last_name" text null, "phone" text null, "code" text not null, "balance" numeric not null default 0, "total_earnings" numeric not null default 0, "status" text check ("status" in ('pending', 'active', 'rejected', 'suspended')) not null default 'pending', "settings" jsonb not null default '{}', "metadata" jsonb null, "raw_balance" jsonb not null default '{"value":"0","precision":20}', "raw_total_earnings" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_affiliate_email_unique" ON "affiliate" (email) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_affiliate_code_unique" ON "affiliate" (code) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_deleted_at" ON "affiliate" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "affiliate_link" ("id" text not null, "url" text not null, "code" text not null, "clicks" integer not null default 0, "conversions" integer not null default 0, "metadata" jsonb null, "affiliate_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_link_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_affiliate_link_code_unique" ON "affiliate_link" (code) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_link_affiliate_id" ON "affiliate_link" (affiliate_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_link_deleted_at" ON "affiliate_link" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "affiliate_conversion" ("id" text not null, "order_id" text null, "amount" numeric not null default 0, "commission" numeric not null default 0, "status" text check ("status" in ('pending', 'confirmed', 'cancelled')) not null default 'pending', "metadata" jsonb null, "affiliate_id" text not null, "link_id" text not null, "raw_amount" jsonb not null default '{"value":"0","precision":20}', "raw_commission" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_conversion_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_conversion_affiliate_id" ON "affiliate_conversion" (affiliate_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_conversion_link_id" ON "affiliate_conversion" (link_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_conversion_deleted_at" ON "affiliate_conversion" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "affiliate_click" ("id" text not null, "ip" text null, "user_agent" text null, "metadata" jsonb null, "affiliate_id" text not null, "link_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_click_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_click_affiliate_id" ON "affiliate_click" (affiliate_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_click_link_id" ON "affiliate_click" (link_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_click_deleted_at" ON "affiliate_click" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "affiliate_settlement" ("id" text not null, "amount" numeric not null default 0, "currency_code" text not null, "status" text check ("status" in ('pending', 'processing', 'paid', 'failed')) not null default 'pending', "period_start" timestamptz null, "period_end" timestamptz null, "metadata" jsonb null, "affiliate_id" text not null, "raw_amount" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "affiliate_settlement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_settlement_affiliate_id" ON "affiliate_settlement" (affiliate_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_affiliate_settlement_deleted_at" ON "affiliate_settlement" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "affiliate_link" add constraint "affiliate_link_affiliate_id_foreign" foreign key ("affiliate_id") references "affiliate" ("id") on update cascade;`);

    this.addSql(`alter table if exists "affiliate_conversion" add constraint "affiliate_conversion_affiliate_id_foreign" foreign key ("affiliate_id") references "affiliate" ("id") on update cascade;`);
    this.addSql(`alter table if exists "affiliate_conversion" add constraint "affiliate_conversion_link_id_foreign" foreign key ("link_id") references "affiliate_link" ("id") on update cascade;`);

    this.addSql(`alter table if exists "affiliate_click" add constraint "affiliate_click_affiliate_id_foreign" foreign key ("affiliate_id") references "affiliate" ("id") on update cascade;`);
    this.addSql(`alter table if exists "affiliate_click" add constraint "affiliate_click_link_id_foreign" foreign key ("link_id") references "affiliate_link" ("id") on update cascade;`);

    this.addSql(`alter table if exists "affiliate_settlement" add constraint "affiliate_settlement_affiliate_id_foreign" foreign key ("affiliate_id") references "affiliate" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "affiliate_link" drop constraint if exists "affiliate_link_affiliate_id_foreign";`);

    this.addSql(`alter table if exists "affiliate_conversion" drop constraint if exists "affiliate_conversion_affiliate_id_foreign";`);

    this.addSql(`alter table if exists "affiliate_click" drop constraint if exists "affiliate_click_affiliate_id_foreign";`);

    this.addSql(`alter table if exists "affiliate_settlement" drop constraint if exists "affiliate_settlement_affiliate_id_foreign";`);

    this.addSql(`alter table if exists "affiliate_conversion" drop constraint if exists "affiliate_conversion_link_id_foreign";`);

    this.addSql(`alter table if exists "affiliate_click" drop constraint if exists "affiliate_click_link_id_foreign";`);

    this.addSql(`drop table if exists "affiliate" cascade;`);

    this.addSql(`drop table if exists "affiliate_link" cascade;`);

    this.addSql(`drop table if exists "affiliate_conversion" cascade;`);

    this.addSql(`drop table if exists "affiliate_click" cascade;`);

    this.addSql(`drop table if exists "affiliate_settlement" cascade;`);
  }

}
