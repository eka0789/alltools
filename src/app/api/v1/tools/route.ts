import { NextRequest } from "next/server";
import { getCatalog } from "@/lib/data";
import { searchTools } from "@/lib/search";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { corsPreflight, errorJson, publicJson, slimTool } from "@/lib/public-api";

export const runtime = "nodejs";

// GET /api/v1/tools — paginated public catalog with optional filters.
// Params: page, perPage (≤100), category, tag, pricing, q, sort.
export async function GET(req: NextRequest) {
  if (!rateLimit(`public-api:${clientIp(req)}`, 60, 60_000).ok) {
    return errorJson("rate limited", 429);
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 200);
  const category = (sp.get("category") ?? "").trim().toLowerCase();
  const tag = (sp.get("tag") ?? "").trim().toLowerCase();
  const pricing = (sp.get("pricing") ?? "").trim().toLowerCase();
  const sortParam = sp.get("sort") ?? "name";
  const sort =
    sortParam === "newest" || sortParam === "popular" ? sortParam : ("name" as const);

  const perPage = Math.min(100, Math.max(1, Number(sp.get("perPage")) || 24));
  const page = Math.max(1, Number(sp.get("page")) || 1);

  if (pricing && !["free", "freemium", "paid"].includes(pricing)) {
    return errorJson("pricing must be free | freemium | paid", 400);
  }

  let items;
  let total: number;
  if (q) {
    // Reuse the in-app search (fuzzy + synonyms + intents) for q queries.
    const result = searchTools({ q, filters: { category: category || undefined, tag: tag || undefined, pricing: pricing || undefined }, page, perPage, sort });
    items = result.items;
    total = result.total;
  } else {
    const { tools } = getCatalog();
    let pool = tools.filter((t) => t.status === "active");
    if (category) pool = pool.filter((t) => t.categorySlug === category);
    if (tag) pool = pool.filter((t) => t.tags.includes(tag));
    if (pricing) pool = pool.filter((t) => t.pricing === pricing);
    total = pool.length;
    const sorted = [...pool].sort((a, b) => {
      if (sort === "newest") return b.createdAt - a.createdAt;
      if (sort === "popular") return b.weeklyClicks - a.weeklyClicks || b.clicks - a.clicks;
      return a.name.localeCompare(b.name);
    });
    items = sorted.slice((page - 1) * perPage, page * perPage);
  }

  return publicJson({
    data: items.map(slimTool),
    meta: { total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) },
  });
}

export async function OPTIONS() {
  return corsPreflight();
}
