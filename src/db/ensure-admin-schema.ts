import { dbClient } from "./client";

// Self-healing admin schema, mirroring ensureAuthSchema(). The production
// deploy pipeline (LocalDeploy) does not run `drizzle-kit push`, so without
// this a fresh release would query columns the live DB does not have yet
// (deleted_at / rejection_reason) and the catalog refresh would fail. The
// DDL below is idempotent and additive only — safe to run on every cold
// start. Once the canonical migration (`db:push` / db-migrate-safe.mjs) has
// run, these checks are just two cheap PRAGMAs.

const ADMIN_DDL = [
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
  `CREATE TABLE IF NOT EXISTS tool_impressions (
    slug text NOT NULL,
    day text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    PRIMARY KEY (slug, day)
  )`,
  `CREATE TABLE IF NOT EXISTS email_campaigns (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    subject text NOT NULL,
    body text DEFAULT '' NOT NULL,
    segment text DEFAULT 'subscribers' NOT NULL,
    cta_label text,
    cta_url text,
    status text DEFAULT 'draft' NOT NULL,
    scheduled_at integer,
    sent_at integer,
    recipients integer DEFAULT 0 NOT NULL,
    sent_count integer DEFAULT 0 NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS email_events (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    campaign_id integer NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    email text NOT NULL,
    type text NOT NULL,
    url text,
    created_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS email_events_unique ON email_events (campaign_id, email, type)`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    token_hash text NOT NULL,
    actor text NOT NULL,
    role text NOT NULL,
    ip text,
    user_agent text,
    created_at integer NOT NULL,
    last_seen_at integer NOT NULL,
    expires_at integer NOT NULL,
    revoked_at integer
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_token_unique ON admin_sessions (token_hash)`,
  `CREATE TABLE IF NOT EXISTS approvals (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    kind text NOT NULL,
    target text NOT NULL,
    payload text DEFAULT '{}' NOT NULL,
    summary text DEFAULT '' NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    requested_by text NOT NULL,
    decided_by text,
    decided_at integer,
    note text,
    created_at integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals (status, created_at)`,
  `CREATE TABLE IF NOT EXISTS collections (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    tagline text DEFAULT '' NOT NULL,
    description text DEFAULT '' NOT NULL,
    emoji text DEFAULT '📦' NOT NULL,
    tools text DEFAULT '[]' NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active integer DEFAULT true NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS collections_slug_unique ON collections (slug)`,
  `CREATE TABLE IF NOT EXISTS glossary_terms (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    slug text NOT NULL,
    term text NOT NULL,
    category text NOT NULL,
    short text NOT NULL,
    definition text NOT NULL,
    example text,
    related_tools text DEFAULT '[]' NOT NULL,
    related_terms text DEFAULT '[]' NOT NULL,
    active integer DEFAULT true NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS glossary_terms_slug_unique ON glossary_terms (slug)`,
];

let ready: Promise<void> | null = null;

async function columnNames(table: string): Promise<Set<string>> {
  const result = await dbClient.execute(`PRAGMA table_info('${table}')`);
  return new Set(
    result.rows.map((row) => String((row as Record<string, unknown>).name ?? "")),
  );
}

export async function ensureAdminSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const statement of ADMIN_DDL) {
        await dbClient.execute(statement);
      }

      const toolColumns = await columnNames("tools");
      if (toolColumns.size > 0) {
        if (!toolColumns.has("deleted_at")) {
          await dbClient.execute("ALTER TABLE `tools` ADD `deleted_at` integer");
        }
        if (!toolColumns.has("link_ignored_at")) {
          await dbClient.execute("ALTER TABLE `tools` ADD `link_ignored_at` integer");
        }
        if (!toolColumns.has("recheck_after")) {
          await dbClient.execute("ALTER TABLE `tools` ADD `recheck_after` integer");
        }
        if (!toolColumns.has("publish_at")) {
          await dbClient.execute("ALTER TABLE `tools` ADD `publish_at` integer");
        }
        if (!toolColumns.has("seo_title")) {
          await dbClient.execute("ALTER TABLE `tools` ADD `seo_title` text");
        }
        if (!toolColumns.has("seo_description")) {
          await dbClient.execute("ALTER TABLE `tools` ADD `seo_description` text");
        }
        if (!toolColumns.has("seo_noindex")) {
          await dbClient.execute("ALTER TABLE `tools` ADD `seo_noindex` integer NOT NULL DEFAULT 0");
        }
        if (!toolColumns.has("featured_order")) {
          await dbClient.execute("ALTER TABLE `tools` ADD `featured_order` integer");
        }
      }

      const categoryColumns = await columnNames("categories");
      if (categoryColumns.size > 0) {
        if (!categoryColumns.has("seo_title")) {
          await dbClient.execute("ALTER TABLE `categories` ADD `seo_title` text");
        }
        if (!categoryColumns.has("seo_description")) {
          await dbClient.execute("ALTER TABLE `categories` ADD `seo_description` text");
        }
      }

      const submissionColumns = await columnNames("submissions");
      if (submissionColumns.size > 0) {
        if (!submissionColumns.has("rejection_reason")) {
          await dbClient.execute("ALTER TABLE `submissions` ADD `rejection_reason` text");
        }
        if (!submissionColumns.has("submitter_email")) {
          await dbClient.execute("ALTER TABLE `submissions` ADD `submitter_email` text");
        }
        if (!submissionColumns.has("assigned_to")) {
          await dbClient.execute("ALTER TABLE `submissions` ADD `assigned_to` text");
        }
        if (!submissionColumns.has("internal_notes")) {
          await dbClient.execute("ALTER TABLE `submissions` ADD `internal_notes` text");
        }
      }

      const feedbackColumns = await columnNames("feedback");
      if (feedbackColumns.size > 0) {
        if (!feedbackColumns.has("assigned_to")) {
          await dbClient.execute("ALTER TABLE `feedback` ADD `assigned_to` text");
        }
        if (!feedbackColumns.has("internal_notes")) {
          await dbClient.execute("ALTER TABLE `feedback` ADD `internal_notes` text");
        }
      }

      const orderColumns = await columnNames("orders");
      if (orderColumns.size > 0) {
        if (!orderColumns.has("refunded_amount")) {
          await dbClient.execute("ALTER TABLE `orders` ADD `refunded_amount` integer NOT NULL DEFAULT 0");
        }
        if (!orderColumns.has("refund_reason")) {
          await dbClient.execute("ALTER TABLE `orders` ADD `refund_reason` text");
        }
      }

      const auditColumns = await columnNames("admin_audit");
      if (auditColumns.size > 0) {
        if (!auditColumns.has("before_json")) {
          await dbClient.execute("ALTER TABLE `admin_audit` ADD `before_json` text");
        }
        if (!auditColumns.has("after_json")) {
          await dbClient.execute("ALTER TABLE `admin_audit` ADD `after_json` text");
        }
      }
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
