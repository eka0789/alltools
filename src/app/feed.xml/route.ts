import { getCatalog } from "@/lib/data";
import { COLLECTIONS } from "@/data/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// RSS 2.0 feed of the newest catalog entries — a low-friction follow channel
// that doesn't need an account or a deployed newsletter.
export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const { tools, total } = getCatalog();

  const newest = [...tools]
    .filter((t) => t.status !== "deprecated")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);

  const items = newest
    .map(
      (t) => `    <item>
      <title>${escapeXml(t.name)} — ${escapeXml(t.categoryName)}</title>
      <link>${base}/tools/${t.slug}</link>
      <guid isPermaLink="true">${base}/tools/${t.slug}</guid>
      <description>${escapeXml(t.description)}</description>
      <pubDate>${new Date(t.createdAt).toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AllTools — The Developer Dictionary</title>
    <link>${base}</link>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Newest of ${total} curated developer tools, resources and AI services. Curated collections: ${COLLECTIONS.map((c) => c.title).join(", ")}.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
