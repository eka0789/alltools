/**
 * AllTools link health checker.
 *
 * Verifies every tool URL: HTTP status, redirect target, response time.
 * 2xx/3xx (followed) → tool.verified = true, lastVerifiedAt = now.
 * 404/410/DNS errors → tool.status = 'needs_review' (never auto-deleted).
 * 429/5xx/timeouts   → recorded in link_checks only; verified and status
 *                      stay untouched (transient failures must not flip
 *                      healthy tools' badges or flag them for review).
 *
 * Supports both storage modes:
 *   - local SQLite file (better-sqlite3) — default
 *   - remote libSQL/Turso when ALLTOOLS_DB_URL is set (used by CI/cron)
 *
 * Usage: npm run check-links [-- --only-unchecked] [-- --limit N]
 */
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import path from "node:path";

const REMOTE_URL = process.env.ALLTOOLS_DB_URL ?? "";
const IS_REMOTE = REMOTE_URL !== "" && !REMOTE_URL.startsWith("file:");
const DB_PATH =
  process.env.ALLTOOLS_DB ?? path.join(process.cwd(), "data", "alltools.db");
const CONCURRENCY = 6;
const TIMEOUT_MS = 12000;
const UA = "AllToolsLinkChecker/1.0 (+directory link verification)";

// Tiny adapter so the checker body stays storage-agnostic. better-sqlite3 is
// synchronous; libSQL async — the async surface covers both.
let store;
if (IS_REMOTE) {
  const client = createClient({
    url: REMOTE_URL,
    authToken: process.env.ALLTOOLS_DB_AUTH_TOKEN,
  });
  store = {
    async all(sql, args = []) {
      const res = await client.execute({ sql, args });
      return res.rows;
    },
    async run(sql, args = []) {
      await client.execute({ sql, args });
    },
    close() {
      client.close();
    },
  };
  console.log(`Checking links against REMOTE database (${REMOTE_URL})`);
} else {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  store = {
    async all(sql, args = []) {
      return sqlite.prepare(sql).all(...args);
    },
    async run(sql, args = []) {
      return sqlite.prepare(sql).run(...args);
    },
    close() {
      sqlite.close();
    },
  };
}

let tools = await store.all(
  "SELECT id, name, slug, url FROM tools WHERE status != 'deprecated'",
);

const onlyUnchecked = process.argv.includes("--only-unchecked");
if (onlyUnchecked) {
  const recent = await store.all(
    "SELECT DISTINCT tool_id FROM link_checks WHERE ok = 1 AND checked_at > ?",
    [Date.now() - 7 * 24 * 3600 * 1000],
  );
  const fresh = new Set(recent.map((r) => Number(r.tool_id)));
  tools = tools.filter((t) => !fresh.has(Number(t.id)));
}

const limitIdx = process.argv.indexOf("--limit");
const limit = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : Infinity;
if (Number.isFinite(limit) && limit > 0) tools = tools.slice(0, limit);

console.log(
  `Checking ${tools.length} tool URLs (concurrency ${CONCURRENCY})…`,
);

const stats = { ok: 0, review: 0, transient: 0 };

async function checkTool(tool) {
  const started = Date.now();
  let httpStatus = null;
  let ok = false;
  let error = null;

  const attempt = async (method, ua) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(tool.url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  const BROWSER_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 AllToolsLinkChecker/1.0";

  try {
    let res = await attempt("HEAD", UA);
    // Some sites reject HEAD or bot-like UAs; retry with GET + browser UA
    if (res.status === 405 || res.status === 501) {
      res = await attempt("GET", UA);
    }
    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      try {
        const retry = await attempt("GET", BROWSER_UA);
        if (retry.status >= 200 && retry.status < 400) res = retry;
      } catch {
        // keep original result
      }
    }
    httpStatus = res.status;
    ok = res.status >= 200 && res.status < 400;
  } catch (e) {
    error = e?.cause?.code ?? e?.name ?? "error";
    if (error === "AbortError") error = "timeout";
    // Network-level failure: one more try with GET + browser UA
    try {
      const retry = await attempt("GET", BROWSER_UA);
      httpStatus = retry.status;
      ok = retry.status >= 200 && retry.status < 400;
      if (ok) error = null;
    } catch {
      // keep original failure
    }
  }

  const elapsed = Date.now() - started;

  await store.run(
    `INSERT INTO link_checks (tool_id, url, http_status, ok, response_time_ms, error, checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [Number(tool.id), tool.url, httpStatus, ok ? 1 : 0, elapsed, error, Date.now()],
  );

  if (ok) {
    await store.run(
      `UPDATE tools SET verified = 1, last_verified_at = ?, status = CASE WHEN status = 'needs_review' THEN 'active' ELSE status END, updated_at = ? WHERE id = ?`,
      [Date.now(), Date.now(), Number(tool.id)],
    );
    stats.ok += 1;
    return `  ✓ ${tool.slug} → ${httpStatus} (${elapsed}ms)`;
  }

  if (httpStatus === 404 || httpStatus === 410 || (error && !httpStatus)) {
    await store.run(
      `UPDATE tools SET verified = 0, status = 'needs_review', updated_at = ? WHERE id = ?`,
      [Date.now(), Number(tool.id)],
    );
    stats.review += 1;
    return `  ✗ ${tool.slug} → ${httpStatus ?? error} → marked needs_review`;
  }

  // Transient failure: log it, but leave verified/status untouched — a single
  // 429/5xx must not wipe a healthy tool's verified badge.
  stats.transient += 1;
  return `  ~ ${tool.slug} → ${httpStatus ?? error} (transient, not flagged)`;
}

async function run() {
  const queue = [...tools];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const tool = queue.shift();
      if (!tool) break;
      const line = await checkTool(tool);
      console.log(line);
    }
  });
  await Promise.all(workers);

  console.log(
    `\nDone. OK: ${stats.ok} · flagged needs_review: ${stats.review} · transient failures: ${stats.transient}`,
  );
  store.close();
}

run();
