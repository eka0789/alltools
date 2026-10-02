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

// better-sqlite3 returns raw snake_case column names; data.ts's catalog
// builder expects the drizzle-style camelCase property names.
const COLUMN_MAP = {
  category_id: "categoryId",
  subcategory_id: "subcategoryId",
  open_source: "openSource",
  self_hosted: "selfHosted",
  github_url: "githubUrl",
  documentation_url: "documentationUrl",
  use_cases: "useCases",
  related_tools: "relatedTools",
  last_verified_at: "lastVerifiedAt",
  created_at: "createdAt",
  updated_at: "updatedAt",
  home_order: "homeOrder",
  sort_order: "sortOrder",
  tool_count: "toolCount",
};
const camelize = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [COLUMN_MAP[k] ?? k, v]),
  );

const categories = db
  .prepare("SELECT * FROM categories ORDER BY sort_order")
  .all()
  .map(camelize);
const subcategories = db
  .prepare("SELECT * FROM subcategories ORDER BY sort_order")
  .all()
  .map(camelize);
const tools = db
  .prepare("SELECT * FROM tools ORDER BY id")
  .all()
  .map(camelize);

const payload = { exportedAt: Date.now(), categories, subcategories, tools };
const out = path.join(process.cwd(), "src", "data", "catalog.generated.json");
fs.writeFileSync(out, JSON.stringify(payload));
console.log(
  `catalog export: ${tools.length} tools, ${categories.length} categories -> ${path.relative(process.cwd(), out)}`,
);
