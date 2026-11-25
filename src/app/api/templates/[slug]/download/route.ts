import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
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

  // Template berbasis ZIP: stream arsip dari penyimpanan privat. Karena file
  // tidak ada di public/, tidak bisa diunduh tanpa lolos pengecekan entitlement.
  if (template.archivePath) {
    const relative = template.archivePath.replace(/^[./\\]+/, "");
    const filePath = path.join(process.cwd(), relative);
    try {
      const file = await fs.readFile(filePath);
      return new Response(new Uint8Array(file), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${template.slug}.zip"`,
          "Content-Length": String(file.byteLength),
          "Cache-Control": "private, no-store",
        },
      });
    } catch (err) {
      console.error("[template-download] archive unavailable:", filePath, err);
      return Response.json({ error: "archive-unavailable" }, { status: 500 });
    }
  }

  if (!template.preset) {
    return Response.json({ error: "unsupported-template" }, { status: 500 });
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
