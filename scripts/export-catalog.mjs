/**
 * Exports the full catalog to src/data/catalog.generated.json.
 * Run after seeding (see vercel-build script): the generated JSON is
 * imported statically by src/lib/data.ts so serverless deployments get
 * the catalog bundled into the code instead of relying on filesystem
 * tracing of the SQLite file.
 */
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.ALLTOOLS_DB ?? path.join(process.cwd(), "data", "alltools.db");
if (!fs.existsSync(DB_PATH)) {
  console.error(`catalog export: database not found at ${DB_PATH}`);
  process.exit(1);
}
const db = new Database(DB_PATH, { readonly: true });

const categories = db.prepare("SELECT * FROM categories ORDER BY sort_order").all();
const subcategories = db.prepare("SELECT * FROM subcategories ORDER BY sort_order").all();
const tools = db.prepare("SELECT * FROM tools ORDER BY id").all();

const payload = { exportedAt: Date.now(), categories, subcategories, tools };
const out = path.join(process.cwd(), "src", "data", "catalog.generated.json");
fs.writeFileSync(out, JSON.stringify(payload));
console.log(
  `catalog export: ${tools.length} tools, ${categories.length} categories -> ${path.relative(process.cwd(), out)}`,
);
