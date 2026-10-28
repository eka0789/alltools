import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTemplate } from "@/data/templates";
import { getUserAccess, canDownloadTemplate } from "@/lib/entitlements";
import { generateBoilerplate, slugifyProjectName } from "@/lib/generators/boilerplate";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/templates/[slug]/download — kembalikan peta file untuk di-zip di
// browser. Premium template ditolak tanpa entitlement (pro_all / tpl:slug).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!rateLimit(`template-dl:${clientIp(req)}`, 20, 60_000).ok) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) return Response.json({ error: "not-found" }, { status: 404 });

  if (template.priceIdr > 0) {
    const user = await getSessionUser();
    if (!user) return Response.json({ error: "login-required", buyUrl: `/templates/${slug}` }, { status: 401 });
    const access = await getUserAccess(user.id);
    if (!canDownloadTemplate(access, slug)) {
      return Response.json({ error: "upgrade-required", buyUrl: `/templates/${slug}` }, { status: 402 });
    }
  }

  const files = generateBoilerplate({
    projectName: slugifyProjectName(template.slug),
    stack: template.preset.stack,
    database: template.preset.database,
    auth: template.preset.auth,
    docker: template.preset.docker,
    tests: template.preset.tests,
  });
  // File tambahan khusus template menimpa hasil generator bila bentrok.
  for (const [path, content] of Object.entries(template.extraFiles ?? {})) {
    files[path] = content;
  }
  return Response.json({ ok: true, name: template.slug, files });
}
