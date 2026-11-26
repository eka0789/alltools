import { db } from "@/db/client";
import { linkChecks, tools } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isPrivateHost } from "./url-check";

// On-demand link verification for the admin UI. Mirrors the CLI checker
// (scripts/check-links.mjs) at a smaller scale: HEAD then GET fallback,
// browser-UA retry for bot-hostile sites, and the same outcome rules:
//   2xx/3xx          → ok (verified, needs_review → active)
//   404/410/DNS      → needs_review
//   429/5xx/timeouts → transient (recorded, status untouched)
// Private hosts are never fetched.

const TIMEOUT_MS = 10_000;
const UA = "AktifKodingLinkChecker/1.0 (+directory link verification)";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 AktifKodingLinkChecker/1.0";

export type CheckOutcome = "ok" | "needs_review" | "transient" | "blocked";

export interface CheckResult {
  outcome: CheckOutcome;
  httpStatus: number | null;
  responseTimeMs: number;
  error: string | null;
}

async function attempt(url: string, method: string, ua: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkUrl(url: string): Promise<CheckResult> {
  const started = Date.now();

  let blocked = false;
  try {
    blocked = isPrivateHost(new URL(url).hostname);
  } catch {
    blocked = true;
  }
  if (blocked) {
    return { outcome: "blocked", httpStatus: null, responseTimeMs: 0, error: "blocked_private_host" };
  }

  let httpStatus: number | null = null;
  let error: string | null = null;
  let ok = false;

  try {
    let res = await attempt(url, "HEAD", UA);
    // Some sites reject HEAD or bot-like UAs; retry with GET.
    if (res.status === 405 || res.status === 501) {
      res = await attempt(url, "GET", UA);
    }
    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      try {
        const retry = await attempt(url, "GET", BROWSER_UA);
        if (retry.status >= 200 && retry.status < 400) res = retry;
      } catch {
        // keep original result
      }
    }
    httpStatus = res.status;
    ok = res.status >= 200 && res.status < 400;
  } catch (e) {
    const err = e as { cause?: { code?: string }; name?: string };
    error = err?.cause?.code ?? err?.name ?? "error";
    if (error === "AbortError") error = "timeout";
    try {
      const retry = await attempt(url, "GET", BROWSER_UA);
      httpStatus = retry.status;
      ok = retry.status >= 200 && retry.status < 400;
      if (ok) error = null;
    } catch {
      // keep original failure
    }
  }

  const responseTimeMs = Date.now() - started;

  if (ok) return { outcome: "ok", httpStatus, responseTimeMs, error: null };
  if (httpStatus === 404 || httpStatus === 410 || (!httpStatus && error)) {
    return { outcome: "needs_review", httpStatus, responseTimeMs, error };
  }
  return { outcome: "transient", httpStatus, responseTimeMs, error };
}

export interface CheckableTool {
  id: number;
  slug: string;
  url: string;
  status: string;
}

export async function runCheckForTool(tool: CheckableTool): Promise<CheckResult> {
  const result = await checkUrl(tool.url);
  const now = Date.now();

  try {
    await db.insert(linkChecks).values({
      toolId: tool.id,
      url: tool.url,
      httpStatus: result.httpStatus,
      ok: result.outcome === "ok",
      responseTimeMs: result.responseTimeMs,
      error: result.error,
      checkedAt: now,
    });
  } catch {
    // The badge update below still matters even if history logging fails.
  }

  if (result.outcome === "ok") {
    if (tool.status === "needs_review") {
      await db
        .update(tools)
        .set({ verified: true, lastVerifiedAt: now, status: "active", recheckAfter: null, updatedAt: now })
        .where(eq(tools.id, tool.id));
    } else {
      await db
        .update(tools)
        .set({ verified: true, lastVerifiedAt: now, recheckAfter: null, updatedAt: now })
        .where(eq(tools.id, tool.id));
    }
  } else if (result.outcome === "needs_review") {
    await db
      .update(tools)
      .set({ verified: false, status: "needs_review", updatedAt: now })
      .where(eq(tools.id, tool.id));
  }

  return result;
}

export async function runCheckBatch(items: CheckableTool[], concurrency = 3): Promise<CheckResult[]> {
  const queue = [...items];
  const results: CheckResult[] = [];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      results.push(await runCheckForTool(next));
    }
  });
  await Promise.all(workers);
  return results;
}
