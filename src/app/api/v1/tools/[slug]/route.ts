import { NextRequest } from "next/server";
import { getToolBySlug } from "@/lib/data";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { corsPreflight, errorJson, publicJson, slimTool } from "@/lib/public-api";

export const runtime = "nodejs";

// GET /api/v1/tools/[slug] — one tool, full public projection.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!rateLimit(`public-api:${clientIp(req)}`, 60, 60_000).ok) {
    return errorJson("rate limited", 429);
  }
  const { slug } = await params;
  const tool = getToolBySlug(slug.slice(0, 120));
  if (!tool || tool.status === "deprecated") {
    return errorJson("tool not found", 404);
  }
  return publicJson({ data: slimTool(tool) });
}

export async function OPTIONS() {
  return corsPreflight();
}
