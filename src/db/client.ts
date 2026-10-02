import { drizzle as drizzleBetterSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

// Two storage modes:
// - Remote (Vercel): ALLTOOLS_DB_URL points at a hosted libSQL/Turso
//   instance ("libsql://..." or "https://..."). Queries go over HTTP and are
//   async; ALLTOOLS_DB_AUTH_TOKEN authenticates.
// - Local file: ALLTOOLS_DB (legacy name) or ./data/alltools.db opened with
//   better-sqlite3 — same behavior as before.
// When no usable database exists (e.g. serverless without env vars and a
// read-only filesystem), fall back to an empty in-memory database. data.ts
// detects this via DB_ACTIVE and serves the statically-imported catalog JSON.
const REMOTE_URL = process.env.ALLTOOLS_DB_URL;
const REMOTE_TOKEN = process.env.ALLTOOLS_DB_AUTH_TOKEN;
// ALLTOOLS_DB_DRIVER=libsql forces the libSQL driver even for local file
// URLs — used to exercise the remote code path against a local database.
const FORCE_LIBSQL = process.env.ALLTOOLS_DB_DRIVER === "libsql";
const IS_REMOTE =
  FORCE_LIBSQL ||
  (!!REMOTE_URL && !/^file:/i.test(REMOTE_URL) && !REMOTE_URL.endsWith(".db"));

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

type SqliteDb = ReturnType<typeof drizzleBetterSqlite<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __alltoolsDb?: { db: SqliteDb; active: boolean; remote: boolean };
};

// better-sqlite3 cannot open the bundled db file on a read-only filesystem
// (WAL needs to write -wal/-shm), so that failure falls back to :memory:.
function openDb(): { db: SqliteDb; active: boolean; remote: boolean } {
  if (IS_REMOTE) {
    const client = createClient({
      url: REMOTE_URL || "file:./data/alltools.db",
      authToken: REMOTE_TOKEN || undefined,
    });
    // Both drizzle drivers expose the same query builder; the libsql one
    // returns promises (every runtime caller awaits them), so the shared
    // better-sqlite3 type is safe at the call sites.
    return {
      db: drizzleLibsql(client, { schema }) as unknown as SqliteDb,
      active: true,
      remote: true,
    };
  }

  try {
    const dbPath = resolveDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const dbFile = new Database(dbPath);
    dbFile.pragma("journal_mode = WAL");
    return { db: drizzleBetterSqlite(dbFile, { schema }), active: true, remote: false };
  } catch {
    return {
      db: drizzleBetterSqlite(new Database(":memory:"), { schema }),
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
export const db = opened.db;
export { schema };
