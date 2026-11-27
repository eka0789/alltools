import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/compare/"],
        // /search produces unbounded near-duplicate query URLs — keep
        // crawlers on the canonical browsable pages instead. /favorites and
        // /compare (exact) render per-visitor (localStorage) shells, while
        // /compare/[pair] are indexable SEO comparison pages in sitemap.xml.
        disallow: ["/admin", "/api", "/search", "/favorites", "/compare$", "/stacks/custom"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
