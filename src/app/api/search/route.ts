import { NextRequest, NextResponse } from "next/server";
import { quickSearch } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
