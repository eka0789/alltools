/**
 * GitHub stats enrichment: fetches real stars / last-push / license for every
 * tool that has a GitHub URL, writes them into the `tools` table, and
 * mirrors the snapshot to data/github-stats.json (which seed.ts merges, so
 * the bundled catalog carries it too). Only real API data is ever stored —
 * entries without a repo stay null.
 *
 * Requires GITHUB_TOKEN for useful volume (unauthenticated = 60 req/hour).
 *
 * Usage:
 *   GITHUB_TOKEN=… node scripts/fetch-github-stats.mjs             # local db, missing only
 *   … -- --all          # refetch every repo (refresh stale stars)
 *   ALLTOOLS_DB_URL=…   # run against Turso
 */
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const REMOTE_URL = process.env.ALLTOOLS_DB_URL ?? "";
const IS_REMOTE = REMOTE_URL !== "" && !REMOTE_URL.startsWith("file:");
const TOKEN = process.env.GITHUB_TOKEN ?? "";
const REFRESH_ALL = process.argv.includes("--all");
const STATS_FILE = path.resolve("data/github-stats.json");

let store;
if (IS_REMOTE) {
  const client = createClient({
    url: REMOTE_URL,
    authToken: process.env.ALLTOOLS_DB_AUTH_TOKEN,
  });
  store = {
    all: (sql, args = []) => client.execute({ sql, args }).then((r) => r.rows),
    run: (sql, args = []) => client.execute({ sql, args }),
    close: () => client.close(),
  };
} else {
  const sqlite = new Database(process.env.ALLTOOLS_DB ?? path.join(process.cwd(), "data", "alltools.db"));
  sqlite.pragma("journal_mode = WAL");
  store = {
    all: (sql, args = []) => sqlite.prepare(sql).all(...args),
    run: (sql, args = []) => sqlite.prepare(sql).run(...args),
    close: () => sqlite.close(),
  };
}

function parseRepo(githubUrl) {
  try {
    const url = new URL(githubUrl);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;
    const [owner, repo] = url.pathname.replace(/^\/+/, "").split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

const existingStats = (() => {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch {
    return {};
  }
})();

const tools = await store.all(
  `SELECT slug, github_url, github_stars FROM tools WHERE github_url IS NOT NULL AND github_url != ''`,
);

const targets = tools.filter((t) => {
  if (!parseRepo(t.github_url)) return false;
  if (REFRESH_ALL) return true;
  return t.github_stars == null && existingStats[t.slug]?.stars == null;
});

console.log(
  `Fetching stats for ${targets.length}/${tools.length} repos${TOKEN ? "" : " (WARNING: no GITHUB_TOKEN — limited to 60 req/hour)"}…`,
);

let ok = 0;
let fail = 0;
let rateLimited = false;

async function fetchRepo(tool) {
  const { owner, repo } = parseRepo(tool.github_url);
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "AllToolsStatsEnricher/1.0",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (res.status === 403 || res.status === 429) {
    rateLimited = true;
    throw new Error("rate limited");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const stats = {
    stars: typeof data.stargazers_count === "number" ? data.stargazers_count : null,
    pushedAt: data.pushed_at ? Date.parse(data.pushed_at) : null,
    license: data.license?.spdx_id && data.license.spdx_id !== "NOASSERTION" ? data.license.spdx_id : null,
  };
  existingStats[tool.slug] = stats;
  await store.run(
    `UPDATE tools SET github_stars = ?, github_pushed_at = ?, github_license = ?, updated_at = updated_at WHERE slug = ?`,
    [stats.stars, stats.pushedAt, stats.license, String(tool.slug)],
  );
  ok += 1;
  return `  ✓ ${tool.slug} → ★${stats.stars?.toLocaleString() ?? "?"} ${stats.license ?? ""}`;
}

const queue = [...targets];
const CONCURRENCY = 4;
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length > 0 && !rateLimited) {
    const tool = queue.shift();
    if (!tool) break;
    try {
      console.log(await fetchRepo(tool));
    } catch (e) {
      fail += 1;
      console.log(`  ✗ ${tool.slug} → ${e.message}`);
      if (rateLimited) break;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
});
await Promise.all(workers);

// Mirror to the JSON snapshot so seed.ts bundles the same data.
fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
fs.writeFileSync(STATS_FILE, JSON.stringify(existingStats, null, 2) + "\n");

console.log(`\nDone. fetched: ${ok} · failed: ${fail} · saved snapshot: ${path.relative(process.cwd(), STATS_FILE)}`);
if (rateLimited) {
  console.log("GitHub rate limit hit — re-run later (or set GITHUB_TOKEN for 5,000 req/hour).");
}
store.close();
