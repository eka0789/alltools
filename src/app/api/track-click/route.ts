import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { toolClicks } from "@/db/schema";
import { getCatalog } from "@/lib/data";
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

  try {
    await db
      .insert(toolClicks)
      .values({ slug, clicks: 1, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: toolClicks.slug,
        set: { clicks: sql`${toolClicks.clicks} + 1`, updatedAt: Date.now() },
      });
  } catch (err) {
    console.error("[track-click] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
