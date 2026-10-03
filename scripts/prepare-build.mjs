/**
 * Build-time preparation for Vercel: schema push + seed + catalog export are
 * always pinned to a LOCAL SQLite file (readable/writable at build time).
 * The runtime database (ALLTOOLS_DB_URL, e.g. Turso) must never be *seeded*
 * here — that would wipe live data on every deploy. When remote DB vars ARE
 * present, the cold-start catalog snapshot is exported FROM the remote
 * database instead, so tools created via the admin panel survive redeploys;
 * any remote failure falls back to the locally seeded snapshot.
 * The exported src/data/catalog.generated.json is bundled for the read-only
 * fallback path in src/lib/data.ts.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Ensure the local database directory exists so sqlite/drizzle can create the file.
fs.mkdirSync(path.resolve("data"), { recursive: true });

const localEnv = {
  ...process.env,
  // Pin the build-time DB to the local file, overriding any remote URL.
  ALLTOOLS_DB_URL: "",
  ALLTOOLS_DB: "./data/alltools.db",
};

function run(cmd, args, env) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  return res.status === 0;
}

// 1. Schema + seed the local file (guarantees the bundled fallback is complete
//    even when the remote export below fails).
if (!run("npx", ["drizzle-kit", "push", "--force"], localEnv)) process.exit(1);
if (!run("npx", ["tsx", "src/db/seed.ts", "--reset"], localEnv)) process.exit(1);

// 2. Prefer the live remote catalog for the bundled snapshot. Transient
//    remote failures degrade gracefully to the local seed.
const remoteUrl = process.env.ALLTOOLS_DB_URL ?? "";
const remoteEnv = { ...process.env, ALLTOOLS_DB: "", ALLTOOLS_DB_DRIVER: "libsql" };
if (remoteUrl && !remoteUrl.startsWith("file:")) {
  console.log("[prepare-build] exporting catalog snapshot from remote DB…");
  if (!run("node", ["scripts/export-catalog.mjs"], remoteEnv)) {
    console.warn("[prepare-build] remote export failed — keeping locally seeded snapshot");
    if (!run("node", ["scripts/export-catalog.mjs"], localEnv)) process.exit(1);
  }
} else {
  if (!run("node", ["scripts/export-catalog.mjs"], localEnv)) process.exit(1);
}

const build = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: { ...localEnv, NEXT_TELEMETRY_DISABLED: "1" },
  shell: process.platform === "win32",
});
process.exit(build.status ?? 1);
