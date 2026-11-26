// Idempotent, additive schema sync for the coupons / shared stacks / rate
// limit release. Unlike `drizzle-kit push --force`, this never drops or
// deletes rows: SQLite supports ADD COLUMN with a non-null default, so the
// existing orders keep their data and get discount_amount = 0.
//
// Usage (CI has the secrets; locally point ALLTOOLS_DB_URL at a file: URL):
//   node scripts/db-migrate-safe.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";

function resolveUrl() {
  const raw = process.env.ALLTOOLS_DB_URL?.trim() || process.env.ALLTOOLS_DB?.trim();
  if (!raw) throw new Error("ALLTOOLS_DB_URL (or ALLTOOLS_DB) is required");
  if (/^(libsql|https?|file):/i.test(raw)) return raw;
  return pathToFileURL(path.resolve(raw)).href;
}

const client = createClient({
  url: resolveUrl(),
  authToken: process.env.ALLTOOLS_DB_AUTH_TOKEN || undefined,
});

const ddl = [
  `CREATE TABLE IF NOT EXISTS users (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    email text NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    created_at integer NOT NULL,
    expires_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_unique ON sessions (token_hash)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    email text NOT NULL,
    token_hash text NOT NULL,
    created_at integer NOT NULL,
    expires_at integer NOT NULL,
    used_at integer
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_token_hash_unique ON auth_tokens (token_hash)`,
  `CREATE TABLE IF NOT EXISTS user_lists (
    user_id integer PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    favorites text DEFAULT '[]' NOT NULL,
    compare text DEFAULT '[]' NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS coupons (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    code text NOT NULL,
    discount_type text DEFAULT 'percent' NOT NULL,
    discount_value integer NOT NULL,
    min_amount_idr integer DEFAULT 0 NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    expires_at integer,
    active integer DEFAULT true NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique ON coupons (code)`,
  `CREATE TABLE IF NOT EXISTS shared_stacks (
    id text PRIMARY KEY NOT NULL,
    title text NOT NULL,
    description text DEFAULT '' NOT NULL,
    slugs text DEFAULT '[]' NOT NULL,
    author_label text,
    views integer DEFAULT 0 NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key text PRIMARY KEY NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    reset_at integer NOT NULL
  )`,
];

async function columnsOf(table) {
  const result = await client.execute(`PRAGMA table_info('${table}')`);
  return new Set(result.rows.map((row) => String(row.name)));
}

const orderColumns = await columnsOf("orders");
if (orderColumns.size > 0) {
  if (!orderColumns.has("coupon_code")) {
    ddl.push("ALTER TABLE `orders` ADD `coupon_code` text");
  }
  if (!orderColumns.has("discount_amount")) {
    ddl.push("ALTER TABLE `orders` ADD `discount_amount` integer NOT NULL DEFAULT 0");
  }
}

for (const statement of ddl) {
  await client.execute(statement);
  console.log("✓", statement.split("\n")[0].trim());
}

if (orderColumns.size > 0) {
  const finalColumns = await columnsOf("orders");
  const ordersCount = await client.execute("SELECT COUNT(*) AS c FROM orders");
  console.log("orders columns:", [...finalColumns].join(", "));
  console.log("orders rows (preserved):", ordersCount.rows[0].c);
}
