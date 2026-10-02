import { db } from "@/db/client";
import { categories, linkChecks, subcategories, tools } from "@/db/schema";
import type { Category, Subcategory, Tool } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

type ToolJsonField =
  | "tags"
  | "platforms"
  | "languages"
  | "frameworks"
  | "useCases"
  | "alternatives"
  | "relatedTools";

export type ToolWithMeta = Omit<Tool, ToolJsonField> & {
  tags: string[];
  platforms: string[];
  languages: string[];
  frameworks: string[];
  useCases: string[];
  alternatives: string[];
  relatedTools: string[];
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  subcategoryName: string | null;
  subcategorySlug: string | null;
};

export interface Catalog {
  tools: ToolWithMeta[];
  bySlug: Map<string, ToolWithMeta>;
  byId: Map<number, ToolWithMeta>;
  categories: (Category & { toolCount: number })[];
  subcategories: Subcategory[];
  total: number;
  featured: ToolWithMeta[];
  recent: ToolWithMeta[];
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getToolTags(tool: Tool): string[] {
  return parseJsonArray(tool.tags);
}
export function getToolPlatforms(tool: Tool): string[] {
  return parseJsonArray(tool.platforms);
}

let cache: Catalog | null = null;

export function getCatalog(): Catalog {
  if (cache) return cache;

  const catRows = db.select().from(categories).all();
  const subRows = db.select().from(subcategories).all();
  const toolRows = db.select().from(tools).all();

  const catById = new Map(catRows.map((c) => [c.id, c]));
  const subById = new Map(subRows.map((s) => [s.id, s]));

  const toolsWithMeta: ToolWithMeta[] = toolRows.map((t) => {
    const cat = catById.get(t.categoryId);
    const sub = t.subcategoryId ? subById.get(t.subcategoryId) : undefined;
    return {
      ...t,
      tags: parseJsonArray(t.tags),
      platforms: parseJsonArray(t.platforms),
      languages: parseJsonArray(t.languages),
      frameworks: parseJsonArray(t.frameworks),
      useCases: parseJsonArray(t.useCases),
      alternatives: parseJsonArray(t.alternatives),
      relatedTools: parseJsonArray(t.relatedTools),
      categoryName: cat?.name ?? "Uncategorized",
      categorySlug: cat?.slug ?? "uncategorized",
      categoryIcon: cat?.icon ?? "Box",
      subcategoryName: sub?.name ?? null,
      subcategorySlug: sub?.slug ?? null,
    };
  });

  const counts = new Map<number, number>();
  for (const t of toolsWithMeta) {
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }

  const sortedCats = catRows
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ ...c, toolCount: counts.get(c.id) ?? 0 }));

  const bySlug = new Map(toolsWithMeta.map((t) => [t.slug, t]));
  const byId = new Map(toolsWithMeta.map((t) => [t.id, t]));

  const featured = toolsWithMeta
    .filter((t) => t.featured && t.status === "active")
    .slice(0, 12);

  const recent = toolsWithMeta
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  cache = {
    tools: toolsWithMeta,
    bySlug,
    byId,
    categories: sortedCats,
    subcategories: subRows,
    total: toolsWithMeta.length,
    featured,
    recent,
  };
  return cache;
}

export function invalidateCatalog() {
  cache = null;
}

export function getToolBySlug(slug: string): ToolWithMeta | null {
  return getCatalog().bySlug.get(slug) ?? null;
}

export function needsReviewCount(): number {
  return db
    .select({ n: sql<number>`count(*)` })
    .from(tools)
    .where(eq(tools.status, "needs_review"))
    .all()[0]?.n ?? 0;
}

export function latestLinkChecks(limit = 20) {
  return db
    .select()
    .from(linkChecks)
    .orderBy(desc(linkChecks.checkedAt))
    .limit(limit)
    .all();
}
