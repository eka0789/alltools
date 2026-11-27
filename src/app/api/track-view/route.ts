import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { toolImpressions } from "@/db/schema";
import { isAdmin } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Impression beacon from tool pages. Aggregated per tool per UTC day so a
// popular page costs one upsert per view, not a growing event table. Admin
// traffic is excluded to avoid self-inflation.
export async function POST(req: NextRequest) {
  if (!DB_ACTIVE) return Response.json({ ok: true });
  if (!rateLimit(`view:${clientIp(req)}`, 120, 60_000).ok) {
    return Response.json({ ok: true });
  }

  let slug = "";
  try {
    const body = (await req.json()) as { slug?: unknown };
    slug = String(body.slug ?? "").slice(0, 120);
  } catch {
    return Response.json({ ok: true });
  }
  if (!slug || !getCatalog().bySlug.has(slug)) return Response.json({ ok: true });

  try {
    if (await isAdmin()) return Response.json({ ok: true });
  } catch {
    // continue — better to count than to drop a real view
  }

  const day = new Date().toISOString().slice(0, 10);
  try {
    await db
      .insert(toolImpressions)
      .values({ slug, day, count: 1 })
      .onConflictDoUpdate({
        target: [toolImpressions.slug, toolImpressions.day],
        set: { count: sql`${toolImpressions.count} + 1` },
      });
  } catch {
    // best effort
  }
  return Response.json({ ok: true });
}
