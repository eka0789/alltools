import { NextRequest, NextResponse } from "next/server";
import { db, DB_ACTIVE } from "@/db/client";
import { linkChecks, tools } from "@/db/schema";
import { eq } from "drizzle-orm";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isPrivateHost } from "@/lib/url-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Fluid allows up to 300s; the batch below needs well under that.
export const maxDuration = 60;

const TIMEOUT_MS = 10_000;
const DEFAULT_BATCH = 40;
const MAX_BATCH = 120;

// Incremental link-health sweep, meant for a Vercel Cron hit. Each invocation
// checks the least-recently-verified tools first, so a daily cron keeps the
// whole directory's badges fresh over time. Full sweeps still belong to
// `npm run check-links` (CI or local) which now also supports Turso.
export async function POST(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; reject anything
  // else (and anything from non-cron sources when the secret is unset).
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!DB_ACTIVE) {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }

  const limiter = rateLimit(`cron-links:${clientIp(req)}`, 4, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const batchParam = Number(req.nextUrl.searchParams.get("batch") ?? DEFAULT_BATCH);
  const batch = Math.min(MAX_BATCH, Math.max(1, batchParam || DEFAULT_BATCH));

  const targets = await db
    .select({ id: tools.id, slug: tools.slug, url: tools.url })
    .from(tools)
    .where(eq(tools.status, "active"))
    .orderBy(tools.lastVerifiedAt)
    .limit(batch);

  let ok = 0;
  let review = 0;
  let transient = 0;

  await Promise.all(
    targets.map(async (tool) => {
      const started = Date.now(); // per-check: batch timing must not leak in
      // SSRF guard: never fetch private-network hosts from approved URLs.
      let privateHost = false;
      try {
        privateHost = isPrivateHost(new URL(tool.url).hostname);
      } catch {
        privateHost = true;
      }
      if (privateHost) {
        await db.insert(linkChecks).values({
          toolId: tool.id,
          url: tool.url,
          httpStatus: null,
          ok: false,
          responseTimeMs: 0,
          error: "blocked_private_host",
          checkedAt: Date.now(),
        });
        transient += 1;
        return;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let httpStatus: number | null = null;
      let success = false;
      let error: string | null = null;
      try {
        const res = await fetch(tool.url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; AllToolsLinkChecker/1.0; +directory link verification)",
            Accept: "text/html,*/*;q=0.8",
          },
        });
        httpStatus = res.status;
        success = res.status >= 200 && res.status < 400;
      } catch (e) {
        error = e instanceof Error ? e.name : "error";
      } finally {
        clearTimeout(timer);
      }

      await db.insert(linkChecks).values({
        toolId: tool.id,
        url: tool.url,
        httpStatus,
        ok: success,
        responseTimeMs: Date.now() - started,
        error,
        checkedAt: Date.now(),
      });

      if (success) {
        await db
          .update(tools)
          .set({ verified: true, lastVerifiedAt: Date.now() })
          .where(eq(tools.id, tool.id));
        ok += 1;
      } else if (httpStatus === 404 || httpStatus === 410) {
        await db
          .update(tools)
          .set({ verified: false, status: "needs_review", updatedAt: Date.now() })
          .where(eq(tools.id, tool.id));
        review += 1;
      } else {
        // transient — leave verified/status untouched
        transient += 1;
      }
    }),
  );

  return NextResponse.json({ checked: targets.length, ok, review, transient });
}
