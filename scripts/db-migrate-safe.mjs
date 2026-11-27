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
  if (/^libsql:\/\//i.test(raw)) return raw.replace(/^libsql:\/\//i, "https://");
  if (/^(https?|file):/i.test(raw)) return raw;
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
  `CREATE TABLE IF NOT EXISTS admin_audit (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    actor text NOT NULL,
    action text NOT NULL,
    target text DEFAULT '' NOT NULL,
    detail text DEFAULT '' NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit (created_at)`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    key text PRIMARY KEY NOT NULL,
    value text NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS job_runs (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    job text NOT NULL,
    status text DEFAULT 'running' NOT NULL,
    summary text DEFAULT '' NOT NULL,
    error text,
    started_at integer NOT NULL,
    finished_at integer
  )`,
  `CREATE INDEX IF NOT EXISTS job_runs_job_idx ON job_runs (job, started_at)`,
  `CREATE TABLE IF NOT EXISTS redirects (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    from_path text NOT NULL,
    to_path text NOT NULL,
    status_code integer DEFAULT 301 NOT NULL,
    hits integer DEFAULT 0 NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS redirects_from_unique ON redirects (from_path)`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    type text NOT NULL,
    severity text DEFAULT 'info' NOT NULL,
    title text NOT NULL,
    body text DEFAULT '' NOT NULL,
    link text,
    created_at integer NOT NULL,
    read_at integer
  )`,
  `CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created_at)`,
  `CREATE TABLE IF NOT EXISTS order_events (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type text NOT NULL,
    detail text DEFAULT '' NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS product_overrides (
    product_id text PRIMARY KEY NOT NULL,
    name text,
    price_idr integer,
    promo_price_idr integer,
    promo_starts_at integer,
    promo_ends_at integer,
    active integer DEFAULT true NOT NULL,
    updated_at integer NOT NULL
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

// Admin expansion: soft delete for tools + rejection notes for submissions.
const toolColumns = await columnsOf("tools");
if (toolColumns.size > 0) {
  if (!toolColumns.has("deleted_at")) {
    ddl.push("ALTER TABLE `tools` ADD `deleted_at` integer");
  }
  if (!toolColumns.has("link_ignored_at")) {
    ddl.push("ALTER TABLE `tools` ADD `link_ignored_at` integer");
  }
  if (!toolColumns.has("recheck_after")) {
    ddl.push("ALTER TABLE `tools` ADD `recheck_after` integer");
  }
  if (!toolColumns.has("publish_at")) {
    ddl.push("ALTER TABLE `tools` ADD `publish_at` integer");
  }
  if (!toolColumns.has("seo_title")) {
    ddl.push("ALTER TABLE `tools` ADD `seo_title` text");
  }
  if (!toolColumns.has("seo_description")) {
    ddl.push("ALTER TABLE `tools` ADD `seo_description` text");
  }
  if (!toolColumns.has("seo_noindex")) {
    ddl.push("ALTER TABLE `tools` ADD `seo_noindex` integer NOT NULL DEFAULT 0");
  }
}
const submissionColumns = await columnsOf("submissions");
if (submissionColumns.size > 0) {
  if (!submissionColumns.has("rejection_reason")) {
    ddl.push("ALTER TABLE `submissions` ADD `rejection_reason` text");
  }
  if (!submissionColumns.has("submitter_email")) {
    ddl.push("ALTER TABLE `submissions` ADD `submitter_email` text");
  }
  if (!submissionColumns.has("assigned_to")) {
    ddl.push("ALTER TABLE `submissions` ADD `assigned_to` text");
  }
  if (!submissionColumns.has("internal_notes")) {
    ddl.push("ALTER TABLE `submissions` ADD `internal_notes` text");
  }
}
const feedbackColumns = await columnsOf("feedback");
if (feedbackColumns.size > 0) {
  if (!feedbackColumns.has("assigned_to")) {
    ddl.push("ALTER TABLE `feedback` ADD `assigned_to` text");
  }
  if (!feedbackColumns.has("internal_notes")) {
    ddl.push("ALTER TABLE `feedback` ADD `internal_notes` text");
  }
}
const categoryColumns = await columnsOf("categories");
if (categoryColumns.size > 0) {
  if (!categoryColumns.has("seo_title")) {
    ddl.push("ALTER TABLE `categories` ADD `seo_title` text");
  }
  if (!categoryColumns.has("seo_description")) {
    ddl.push("ALTER TABLE `categories` ADD `seo_description` text");
  }
}
const orderColumnsExtra = await columnsOf("orders");
if (orderColumnsExtra.size > 0) {
  if (!orderColumnsExtra.has("refunded_amount")) {
    ddl.push("ALTER TABLE `orders` ADD `refunded_amount` integer NOT NULL DEFAULT 0");
  }
  if (!orderColumnsExtra.has("refund_reason")) {
    ddl.push("ALTER TABLE `orders` ADD `refund_reason` text");
  }
}
const auditColumns = await columnsOf("admin_audit");
if (auditColumns.size > 0) {
  if (!auditColumns.has("before_json")) {
    ddl.push("ALTER TABLE `admin_audit` ADD `before_json` text");
  }
  if (!auditColumns.has("after_json")) {
    ddl.push("ALTER TABLE `admin_audit` ADD `after_json` text");
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
