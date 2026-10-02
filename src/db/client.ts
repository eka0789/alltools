import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

// Resolve the db across environments: local cwd, Vercel serverless bundles
// (traced files sit relative to the function root, which varies per route),
// or an explicit ALLTOOLS_DB override.
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

const DB_PATH = resolveDbPath();

const globalForDb = globalThis as unknown as {
  __alltoolsSqlite?: Database.Database;
  __alltoolsDbFile?: boolean;
};

// On serverless (read-only fs, no baked db file) opening the file fails;
// fall back to an empty in-memory database. data.ts detects this via
// DB_IS_FILE and serves the statically-imported catalog JSON instead.
function openSqlite(): { db: Database.Database; isFile: boolean } {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const dbFile = new Database(DB_PATH);
    dbFile.pragma("journal_mode = WAL");
    return { db: dbFile, isFile: true };
  } catch {
    return { db: new Database(":memory:"), isFile: false };
  }
}

const opened = globalForDb.__alltoolsSqlite
  ? { db: globalForDb.__alltoolsSqlite, isFile: !!globalForDb.__alltoolsDbFile }
  : openSqlite();

if (!globalForDb.__alltoolsSqlite) {
  globalForDb.__alltoolsSqlite = opened.db;
  globalForDb.__alltoolsDbFile = opened.isFile;
}

export const DB_IS_FILE = opened.isFile;
export const db = drizzle(opened.db, { schema });
export { schema };
