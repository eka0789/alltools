/**
 * AllTools link health checker.
 *
 * Verifies every tool URL: HTTP status, redirect target, response time.
 * 2xx/3xx (followed) → tool.verified = true, lastVerifiedAt = now.
 * 404/410/DNS errors → tool.status = 'needs_review' (never auto-deleted).
 * 429/5xx/timeouts   → recorded in link_checks; status left unchanged
 *                      (transient failures should not flag healthy tools).
 *
 * Usage: npm run check-links [-- --only-unchecked]
 */
import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env.ALLTOOLS_DB ?? path.join(process.cwd(), "data", "alltools.db");
const CONCURRENCY = 6;
const TIMEOUT_MS = 12000;
const UA = "AllToolsLinkChecker/1.0 (+directory link verification)";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const tools = db
  .prepare("SELECT id, name, slug, url FROM tools WHERE status != 'deprecated'")
  .all();

const onlyUnchecked = process.argv.includes("--only-unchecked");
const targets = onlyUnchecked
  ? tools.filter(
      (t) =>
        !db
          .prepare(
            "SELECT id FROM link_checks WHERE tool_id = ? AND ok = 1 AND checked_at > ?",
          )
          .get(t.id, Date.now() - 7 * 24 * 3600 * 1000),
    )
  : tools;

console.log(`Checking ${targets.length} tool URLs (concurrency ${CONCURRENCY})…`);

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

  db.prepare(
    `INSERT INTO link_checks (tool_id, url, http_status, ok, response_time_ms, error, checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(tool.id, tool.url, httpStatus, ok ? 1 : 0, elapsed, error, Date.now());

  if (ok) {
    db.prepare(
      `UPDATE tools SET verified = 1, last_verified_at = ?, status = CASE WHEN status = 'needs_review' THEN 'active' ELSE status END, updated_at = ? WHERE id = ?`,
    ).run(Date.now(), Date.now(), tool.id);
    stats.ok += 1;
    return `  ✓ ${tool.slug} → ${httpStatus} (${elapsed}ms)`;
  }

  if (httpStatus === 404 || httpStatus === 410 || (error && !httpStatus)) {
    db.prepare(
      `UPDATE tools SET verified = 0, status = 'needs_review', updated_at = ? WHERE id = ?`,
    ).run(Date.now(), tool.id);
    stats.review += 1;
    return `  ✗ ${tool.slug} → ${httpStatus ?? error} → marked needs_review`;
  }

  db.prepare(`UPDATE tools SET verified = 0 WHERE id = ?`).run(tool.id);
  stats.transient += 1;
  return `  ~ ${tool.slug} → ${httpStatus ?? error} (transient, not flagged)`;
}

async function run() {
  const queue = [...targets];
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
  db.close();
}

run();
