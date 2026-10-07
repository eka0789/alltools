/**
 * Exports the full catalog to src/data/catalog.generated.json.
 * Run after seeding (see vercel-build script): the generated JSON is
 * imported statically by src/lib/data.ts so serverless deployments get
 * the catalog bundled into the code instead of relying on filesystem
 * tracing of the SQLite file.
 *
 * Dual driver, like check-links.mjs: reads the local SQLite file by
 * default, or the remote Turso database when ALLTOOLS_DB_URL is set —
 * prepare-build uses the remote path so tools created via the admin
 * panel survive redeploys in the bundled snapshot.
 */
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

const REMOTE_URL = process.env.ALLTOOLS_DB_URL ?? "";
const IS_REMOTE = REMOTE_URL !== "" && !REMOTE_URL.startsWith("file:");

let store;
if (IS_REMOTE) {
  const client = createClient({
    url: REMOTE_URL,
    authToken: process.env.ALLTOOLS_DB_AUTH_TOKEN,
  });
  store = {
    all(sql) {
      return client.execute({ sql }).then((r) => r.rows);
    },
    close() {
      client.close();
    },
  };
  console.log(`catalog export: reading REMOTE database (${REMOTE_URL})`);
} else {
  const DB_PATH = process.env.ALLTOOLS_DB || path.join(process.cwd(), "data", "alltools.db");
  if (!fs.existsSync(DB_PATH)) {
    console.error(`catalog export: database not found at ${DB_PATH}`);
    process.exit(1);
  }
  const db = new Database(DB_PATH, { readonly: true });
  store = {
    all(sql) {
      return db.prepare(sql).all();
    },
    close() {
      db.close();
    },
  };
}

// better-sqlite3 / libsql return raw snake_case column names; data.ts's
// catalog builder expects the drizzle-style camelCase property names.
const COLUMN_MAP = {
  category_id: "categoryId",
  subcategory_id: "subcategoryId",
  open_source: "openSource",
  self_hosted: "selfHosted",
  github_url: "githubUrl",
  documentation_url: "documentationUrl",
  install_command: "installCommand",
  use_cases: "useCases",
  pros: "pros",
  cons: "cons",
  related_tools: "relatedTools",
  last_verified_at: "lastVerifiedAt",
  created_at: "createdAt",
  updated_at: "updatedAt",
  github_stars: "githubStars",
  github_pushed_at: "githubPushedAt",
  github_license: "githubLicense",
  weekly_clicks: "weeklyClicks",
  home_order: "homeOrder",
  sort_order: "sortOrder",
  tool_count: "toolCount",
};
const camelize = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [COLUMN_MAP[k] ?? k, v]),
  );

const categories = (await store.all("SELECT * FROM categories ORDER BY sort_order")).map(camelize);
const subcategories = (await store.all("SELECT * FROM subcategories ORDER BY sort_order")).map(camelize);
// Left join keeps tools without clicks; the click counters feed the
// popularity pipeline on cold starts (data.ts merges the rest at runtime).
const tools = (await store.all(
  "SELECT t.*, c.clicks, c.weekly_clicks FROM tools t LEFT JOIN tool_clicks c ON c.slug = t.slug ORDER BY t.id",
)).map(camelize);
store.close();

const payload = { exportedAt: Date.now(), categories, subcategories, tools };
const out = path.join(process.cwd(), "src", "data", "catalog.generated.json");
fs.writeFileSync(out, JSON.stringify(payload));
const starred = tools.filter((t) => t.githubStars != null).length;
console.log(
  `catalog export: ${tools.length} tools (${starred} with GitHub stars), ${categories.length} categories -> ${path.relative(process.cwd(), out)}`,
);
