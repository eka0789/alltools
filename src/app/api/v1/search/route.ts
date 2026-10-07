import { NextRequest } from "next/server";
import { searchTools } from "@/lib/search";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { corsPreflight, errorJson, publicJson, slimTool } from "@/lib/public-api";

export const runtime = "nodejs";

// GET /api/v1/search?q= — full-text search (fuzzy, synonyms, intents).
// Params: q (required), limit (≤25), category, tag, pricing.
export async function GET(req: NextRequest) {
  if (!rateLimit(`public-api:${clientIp(req)}`, 60, 60_000).ok) {
    return errorJson("rate limited", 429);
  }
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 200);
  if (!q) return errorJson("q parameter is required", 400);
  const limit = Math.min(25, Math.max(1, Number(sp.get("limit")) || 10));
  const category = (sp.get("category") ?? "").trim().toLowerCase() || undefined;
  const tag = (sp.get("tag") ?? "").trim().toLowerCase() || undefined;
  const pricing = (sp.get("pricing") ?? "").trim().toLowerCase() || undefined;

  const result = searchTools({ q, filters: { category, tag, pricing }, page: 1, perPage: limit, facets: false });
  return publicJson({
    data: result.items.map(slimTool),
    meta: { query: q, total: result.total, limit },
  });
}

export async function OPTIONS() {
  return corsPreflight();
}
