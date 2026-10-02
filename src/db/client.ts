import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const DB_PATH =
  process.env.ALLTOOLS_DB ?? path.join(process.cwd(), "data", "alltools.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// On read-only filesystems (e.g. Vercel serverless) the database is opened
// in read-only mode; the local data layer treats failures gracefully and
// admin mutations are only expected on self-hosted/local deployments.
const globalForDb = globalThis as unknown as { __alltoolsSqlite?: Database.Database };
const sqlite =
  globalForDb.__alltoolsSqlite ??
  (() => {
    let dbFile: Database.Database;
    try {
      dbFile = new Database(DB_PATH);
      dbFile.pragma("journal_mode = WAL");
    } catch {
      // read-only fallback: no WAL, no writes
      dbFile = new Database(DB_PATH, { readonly: true });
    }
    return dbFile;
  })();
if (!globalForDb.__alltoolsSqlite) globalForDb.__alltoolsSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
