import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/data";
import { STACKS } from "@/lib/stacks";
import { COLLECTIONS } from "@/data/collections";
import { GLOSSARY } from "@/data/glossary";
import { getSeoLandingPages } from "@/lib/programmatic-seo";

// Revalidate hourly instead of force-dynamic per request: keeps lastModified
// honest for search engines and avoids treating every crawler hit as fresh.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { tools, categories } = getCatalog();

  // Stable anchor timestamp: uses the latest tool updatedAt in the catalog
  // rather than new Date() on every request, so search crawlers can trust
  // the lastModified signal.
  const latestToolUpdate = tools.reduce(
    (max, t) => (t.updatedAt > max ? t.updatedAt : max),
    0,
  );
  const catalogDate = latestToolUpdate ? new Date(latestToolUpdate) : new Date("2026-10-07");

  // Deprecated tools 404 — they must never appear in the sitemap.
  const listed = tools.filter((t) => t.status !== "deprecated");

  // Programmatic SEO landing pages (categories × modifiers with ≥3 tools)
  const seoPages = getSeoLandingPages();

  return [
    { url: `${base}/`, lastModified: catalogDate, changeFrequency: "daily", priority: 1 },
    { url: `${base}/tools`, lastModified: catalogDate, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, lastModified: catalogDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/best`, lastModified: catalogDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/collections`, lastModified: catalogDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/glossary`, lastModified: catalogDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/whats-new`, lastModified: catalogDate, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/tags`, lastModified: catalogDate, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/stacks`, lastModified: catalogDate, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ai-chat`, lastModified: catalogDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/submit`, lastModified: catalogDate, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/about`, lastModified: catalogDate, changeFrequency: "monthly", priority: 0.4 },
    ...COLLECTIONS.map((c) => ({
      url: `${base}/collections/${c.slug}`,
      lastModified: catalogDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...GLOSSARY.map((t) => ({
      url: `${base}/glossary/${t.slug}`,
      lastModified: catalogDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: catalogDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...seoPages.map((p) => ({
      url: `${base}${p.url}`,
      lastModified: catalogDate,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...listed.map((t) => ({
      url: `${base}/tools/${t.slug}`,
      lastModified: new Date(t.updatedAt || latestToolUpdate),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...STACKS.map((s) => ({
      url: `${base}/stacks/${s.slug}`,
      lastModified: catalogDate,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
