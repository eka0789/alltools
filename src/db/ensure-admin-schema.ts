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
      if (toolColumns.size > 0 && !toolColumns.has("deleted_at")) {
        await dbClient.execute("ALTER TABLE `tools` ADD `deleted_at` integer");
      }

      const submissionColumns = await columnNames("submissions");
      if (submissionColumns.size > 0 && !submissionColumns.has("rejection_reason")) {
        await dbClient.execute("ALTER TABLE `submissions` ADD `rejection_reason` text");
      }
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
