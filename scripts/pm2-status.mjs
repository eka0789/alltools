import { spawnSync } from "node:child_process";

const target = process.argv[2] || process.env.PM2_APP_NAME || "aktifkoding";
const res = spawnSync("pm2", ["jlist"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

const raw = (res.stdout ?? "").trim();
const idx = raw.indexOf("[");
if (idx < 0) process.exit(0);

try {
  const list = JSON.parse(raw.slice(idx));
  const proc = Array.isArray(list) ? list.find((x) => x && x.name === target) : null;
  if (proc?.pm2_env?.status) {
    console.log(String(proc.pm2_env.status));
  }
} catch {
  // leave empty on malformed output
}
