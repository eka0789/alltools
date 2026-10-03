/**
 * Build-time preparation for Vercel: schema push + seed + catalog export are
 * always pinned to a LOCAL SQLite file (readable/writable at build time).
 * The runtime database (ALLTOOLS_DB_URL, e.g. Turso) must never be touched
 * here — seeding with --reset would wipe live data on every deploy.
 * The exported src/data/catalog.generated.json is bundled for the read-only
 * fallback path in src/lib/data.ts.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Ensure the local database directory exists so sqlite/drizzle can create the file.
fs.mkdirSync(path.resolve("data"), { recursive: true });

const env = {
  ...process.env,
  // Pin the build-time DB to the local file, overriding any remote URL.
  ALLTOOLS_DB_URL: "",
  ALLTOOLS_DB: "./data/alltools.db",
};

const steps = [
  ["npx", ["drizzle-kit", "push", "--force"]],
  ["npx", ["tsx", "src/db/seed.ts", "--reset"]],
  ["node", ["scripts/export-catalog.mjs"]],
];

for (const [cmd, args] of steps) {
  const res = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const build = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: { ...env, NEXT_TELEMETRY_DISABLED: "1" },
  shell: process.platform === "win32",
});
process.exit(build.status ?? 1);
