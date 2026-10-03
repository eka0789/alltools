import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/data";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal tool info for client-side pages (favorites, compare,
// recently-viewed) that resolve slugs from localStorage.

export interface BulkTool {
  slug: string;
  name: string;
  url: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  pricing: string;
  openSource: boolean;
  selfHosted: boolean;
  platforms: string[];
  languages: string[];
  frameworks: string[];
  githubUrl: string | null;
  documentationUrl: string | null;
  githubStars: number | null;
}

export async function GET(req: NextRequest) {
  const limiter = rateLimit(`bulk:${clientIp(req)}`, 60, 60_000);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } },
    );
  }

  const slugsParam = req.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50); // compare cap is 4; favorites page paginates client-side
  if (slugs.length === 0) {
    return NextResponse.json({ items: [] as BulkTool[] });
  }

  const catalog = getCatalog();
  const items: BulkTool[] = [];
  for (const slug of slugs) {
    const t = catalog.bySlug.get(slug);
    if (!t || t.status === "deprecated") continue;
    items.push({
      slug: t.slug,
      name: t.name,
      url: t.url,
      description: t.description,
      categorySlug: t.categorySlug,
      categoryName: t.categoryName,
      pricing: t.pricing,
      openSource: t.openSource,
      selfHosted: t.selfHosted,
      platforms: t.platforms,
      languages: t.languages,
      frameworks: t.frameworks,
      githubUrl: t.githubUrl,
      documentationUrl: t.documentationUrl,
      githubStars: t.githubStars,
    });
  }

  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
