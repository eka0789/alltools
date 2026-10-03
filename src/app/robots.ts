import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /search produces unbounded near-duplicate query URLs — keep
        // crawlers on the canonical browsable pages instead. /favorites and
        // /compare render per-visitor (localStorage) shells.
        disallow: ["/admin", "/api", "/search", "/favorites", "/compare", "/stacks/custom"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
