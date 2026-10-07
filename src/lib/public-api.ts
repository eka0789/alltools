import { NextResponse } from "next/server";
import type { ToolWithMeta } from "./data";

// Shared plumbing for the public JSON API (v1) and the MCP endpoint:
// CORS for browser consumption, CDN-friendly cache headers, and a slim
// tool projection that hides internal bookkeeping.

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function publicJson(
  data: unknown,
  { status = 200, cache = "public, max-age=120, s-maxage=600, stale-while-revalidate=3600" as string | null } = {},
): NextResponse {
  const headers: Record<string, string> = { ...CORS_HEADERS };
  if (cache) headers["Cache-Control"] = cache;
  return NextResponse.json(data, { status, headers });
}

const isoOrNull = (ms: number | null): string | null =>
  ms ? new Date(ms).toISOString() : null;

export function slimTool(t: ToolWithMeta) {
  return {
    slug: t.slug,
    name: t.name,
    description: t.description,
    url: t.url,
    category: t.categorySlug,
    categoryName: t.categoryName,
    subcategory: t.subcategorySlug,
    tags: t.tags,
    pricing: t.pricing,
    openSource: t.openSource,
    selfHostable: t.selfHosted,
    platforms: t.platforms,
    languages: t.languages,
    frameworks: t.frameworks,
    useCases: t.useCases,
    pros: t.pros,
    cons: t.cons,
    installCommand: t.installCommand,
    githubUrl: t.githubUrl,
    githubStars: t.githubStars,
    githubPushedAt: isoOrNull(t.githubPushedAt),
    documentationUrl: t.documentationUrl,
    alternatives: t.alternatives,
    relatedTools: t.relatedTools,
    verified: t.verified,
    lastVerifiedAt: isoOrNull(t.lastVerifiedAt),
    clicks: t.clicks,
    createdAt: isoOrNull(t.createdAt),
    updatedAt: isoOrNull(t.updatedAt),
    detailUrl: `/tools/${t.slug}`,
  };
}

export function errorJson(message: string, status: number): NextResponse {
  return publicJson({ error: message }, { status, cache: null });
}
