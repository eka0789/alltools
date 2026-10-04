import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { toolClicks } from "@/db/schema";
import { getCatalog, applyClickToCache } from "@/lib/data";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Outbound-click counter behind the "Open Website" buttons. This is the only
// honest popularity signal a directory has — it can later feed ordering.
export async function POST(req: NextRequest) {
  const limiter = rateLimit(`click:${clientIp(req)}`, 60, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let slug = "";
  try {
    const body = (await req.json()) as { slug?: unknown };
    if (typeof body?.slug === "string") slug = body.slug.slice(0, 120);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!slug || !getCatalog().bySlug.has(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!DB_ACTIVE) {
    // No DB (read-only serverless fallback) — acknowledge silently.
    return NextResponse.json({ ok: true });
  }

  // All-time counter + a lazy 7-day bucket: whenever week_start is older
  // than 7 days the weekly count restarts at 1. No cron needed for
  // "popular this week" to decay.
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const weekExpired = now - WEEK_MS;

  try {
    await db
      .insert(toolClicks)
      .values({ slug, clicks: 1, weeklyClicks: 1, weekStart: now, updatedAt: now })
      .onConflictDoUpdate({
        target: toolClicks.slug,
        set: {
          clicks: sql`${toolClicks.clicks} + 1`,
          weeklyClicks: sql`CASE WHEN ${toolClicks.weekStart} IS NULL OR ${toolClicks.weekStart} < ${weekExpired} THEN 1 ELSE ${toolClicks.weeklyClicks} + 1 END`,
          weekStart: sql`CASE WHEN ${toolClicks.weekStart} IS NULL OR ${toolClicks.weekStart} < ${weekExpired} THEN ${now} ELSE ${toolClicks.weekStart} END`,
          updatedAt: now,
        },
      });
  } catch (err) {
    console.error("[track-click] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Bump the counters on the in-memory catalog in place (no full rebuild +
  // search reindex per click, and no stale-snapshot rollback in remote
  // mode). If the cache doesn't exist yet (remote cold start), the next
  // TTL refresh reads the row we just wrote.
  applyClickToCache(slug);

  return NextResponse.json({ ok: true });
}
