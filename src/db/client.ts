import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import * as schema from "./schema";

// Two storage modes, both powered by @libsql/client (precompiled N-API binary):
// - Remote (Turso): ALLTOOLS_DB_URL points at a hosted libSQL/Turso instance
//   ("libsql://..." or "https://..."), with ALLTOOLS_DB_AUTH_TOKEN.
// - Local file: ALLTOOLS_DB or ./data/alltools.db converted to a file:// URI.
// When no usable database exists (e.g. serverless without env vars and a
// read-only filesystem, or Vitest hermetic mode ALLTOOLS_DB="."), fall back to
// an empty in-memory database. data.ts detects this via DB_ACTIVE and serves
// the statically-imported catalog JSON.
const REMOTE_URL = process.env.ALLTOOLS_DB_URL?.trim();
const REMOTE_TOKEN = process.env.ALLTOOLS_DB_AUTH_TOKEN?.trim();
const IS_REMOTE =
  !!REMOTE_URL && !/^file:/i.test(REMOTE_URL) && !REMOTE_URL.endsWith(".db");

// Use stateless HTTPS transport instead of WebSocket (libsql:// -> https://).
// WebSocket connections to Turso frequently drop with ECONNRESET on long-lived
// Node/Windows servers and certain proxies/ISPs, whereas HTTPS pipeline is
// stateless and reliable across serverless and PM2 deployments.
function normalizeRemoteUrl(url: string): string {
  return url.replace(/^libsql:\/\//i, "https://");
}

// Resolve the local db across environments: local cwd, Vercel serverless
// bundles (traced files sit relative to the function root, which varies per
// route), or an explicit ALLTOOLS_DB override.
function resolveDbPath(): string {
  if (process.env.ALLTOOLS_DB) return process.env.ALLTOOLS_DB;
  const candidates = [
    path.join(process.cwd(), "data", "alltools.db"),
    path.join(process.cwd(), "..", "data", "alltools.db"),
    path.join(process.cwd(), "..", "..", "data", "alltools.db"),
    path.join(process.cwd(), "..", "..", "..", "data", "alltools.db"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function toLocalFileUrl(dbPath: string): string {
  if (/^file:/i.test(dbPath)) return dbPath;
  return pathToFileURL(path.resolve(dbPath)).href;
}

type LibsqlDb = ReturnType<typeof drizzle<typeof schema>>;
type LibsqlClient = ReturnType<typeof createClient>;

const globalForDb = globalThis as unknown as {
  __alltoolsDb?: { db: LibsqlDb; client: LibsqlClient; active: boolean; remote: boolean };
};

function openDb(): { db: LibsqlDb; client: LibsqlClient; active: boolean; remote: boolean } {
  if (IS_REMOTE) {
    const client = createClient({
      url: normalizeRemoteUrl(REMOTE_URL!),
      authToken: REMOTE_TOKEN || undefined,
    });
    return {
      db: drizzle(client, { schema }),
      client,
      active: true,
      remote: true,
    };
  }

  try {
    const dbPath = resolveDbPath();
    if (fs.existsSync(dbPath) && fs.statSync(dbPath).isDirectory()) {
      throw new Error("Database path is a directory");
    }
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const client = createClient({ url: toLocalFileUrl(dbPath) });
    void client.execute("PRAGMA journal_mode = WAL").catch(() => {});
    // Enforce FK constraints (off by default in SQLite): no orphaned
    // link_checks rows when a tool is deleted.
    void client.execute("PRAGMA foreign_keys = ON").catch(() => {});
    return { db: drizzle(client, { schema }), client, active: true, remote: false };
  } catch {
    const client = createClient({ url: ":memory:" });
    return {
      db: drizzle(client, { schema }),
      client,
      active: false,
      remote: false,
    };
  }
}

const opened = globalForDb.__alltoolsDb ?? openDb();
if (!globalForDb.__alltoolsDb) {
  globalForDb.__alltoolsDb = opened;
}

export const DB_ACTIVE = opened.active;
export const DB_IS_REMOTE = opened.remote;
export const dbClient = opened.client;
export const db = opened.db;
export { schema };
