import { NextRequest } from "next/server";
import { getCatalog } from "@/lib/data";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { corsPreflight, errorJson, publicJson } from "@/lib/public-api";

export const runtime = "nodejs";

// GET /api/v1/categories — taxonomy with live tool counts.
export async function GET(req: NextRequest) {
  if (!rateLimit(`public-api:${clientIp(req)}`, 60, 60_000).ok) {
    return errorJson("rate limited", 429);
  }
  const { categories, subcategories, total } = getCatalog();
  return publicJson({
    data: categories
      .filter((c) => c.toolCount > 0)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
        toolCount: c.toolCount,
        subcategories: subcategories
          .filter((s) => s.categoryId === c.id)
          .map((s) => ({ slug: s.slug, name: s.name })),
      })),
    meta: { totalTools: total },
  });
}

export async function OPTIONS() {
  return corsPreflight();
}
