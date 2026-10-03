import { NextRequest, NextResponse } from "next/server";
import { quickSearch } from "@/lib/search";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limiter = rateLimit(`search:${clientIp(req)}`, 120, 60_000);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } },
    );
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 8);
  const limit = Math.min(20, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 8));

  const items = quickSearch(q, limit).map((t) => ({
    slug: t.slug,
    name: t.name,
    categoryName: t.categoryName,
    description: t.description,
    pricing: t.pricing,
  }));

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
