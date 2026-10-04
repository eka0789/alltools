import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/data";
import { STACKS } from "@/lib/stacks";
import { COLLECTIONS } from "@/data/collections";
import { GLOSSARY } from "@/data/glossary";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { tools, categories } = getCatalog();
  const now = new Date();

  // Deprecated tools 404 — they must never appear in the sitemap.
  const listed = tools.filter((t) => t.status !== "deprecated");

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/collections`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/glossary`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/whats-new`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/tags`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/stacks`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ai-chat`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/submit`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    ...COLLECTIONS.map((c) => ({
      url: `${base}/collections/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...GLOSSARY.map((t) => ({
      url: `${base}/glossary/${t.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...listed.map((t) => ({
      url: `${base}/tools/${t.slug}`,
      lastModified: new Date(t.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...STACKS.map((s) => ({
      url: `${base}/stacks/${s.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
