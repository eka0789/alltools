import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const catalogPath = path.resolve("src", "data", "catalog.generated.json");

if (!fs.existsSync(catalogPath)) {
  console.log("[ensure-catalog] catalog.generated.json missing — building local snapshot…");
  fs.mkdirSync(path.resolve("data"), { recursive: true });

  const localEnv = {
    ...process.env,
    ALLTOOLS_DB_URL: "",
    ALLTOOLS_DB: "./data/alltools.db",
  };

  const run = (cmd, args) => {
    const res = spawnSync(cmd, args, {
      stdio: "inherit",
      env: localEnv,
      shell: process.platform === "win32",
    });
    return res.status === 0;
  };

  if (!run("npx", ["drizzle-kit", "push", "--force"])) process.exit(1);
  if (!run("npx", ["tsx", "src/db/seed.ts", "--reset"])) process.exit(1);
  if (!run("node", ["scripts/export-catalog.mjs"])) process.exit(1);
  console.log("[ensure-catalog] snapshot ready.");
}
