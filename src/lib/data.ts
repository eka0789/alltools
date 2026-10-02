import { db, DB_IS_FILE } from "@/db/client";
import { categories, linkChecks, subcategories, tools } from "@/db/schema";
import type { Category, Subcategory, Tool } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import catalogJson from "@/data/catalog.generated.json";

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

interface RawRow {
  [key: string]: unknown;
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getToolTags(tool: ToolWithMeta | RawRow): string[] {
  return parseJsonArray(tool.tags);
}
export function getToolPlatforms(tool: ToolWithMeta | RawRow): string[] {
  return parseJsonArray(tool.platforms);
}

// Shared row → meta mapping, used for both the SQLite source and the
// statically-imported catalog JSON (serverless fallback).
function buildCatalog(
  catRows: RawRow[],
  subRows: RawRow[],
  toolRows: RawRow[],
): Catalog {
  const catById = new Map(catRows.map((c) => [c.id as number, c]));
  const subById = new Map(subRows.map((s) => [s.id as number, s]));

  const toolsWithMeta: ToolWithMeta[] = toolRows.map((t) => {
    const cat = catById.get(t.categoryId as number);
    const sub = t.subcategoryId ? subById.get(t.subcategoryId as number) : undefined;
    return {
      ...(t as unknown as Tool),
      tags: parseJsonArray(t.tags),
      platforms: parseJsonArray(t.platforms),
      languages: parseJsonArray(t.languages),
      frameworks: parseJsonArray(t.frameworks),
      useCases: parseJsonArray(t.useCases),
      alternatives: parseJsonArray(t.alternatives),
      relatedTools: parseJsonArray(t.relatedTools),
      categoryName: (cat?.name as string) ?? "Uncategorized",
      categorySlug: (cat?.slug as string) ?? "uncategorized",
      categoryIcon: (cat?.icon as string) ?? "Box",
      subcategoryName: sub ? (sub.name as string) : null,
      subcategorySlug: sub ? (sub.slug as string) : null,
    };
  });

  const counts = new Map<number, number>();
  for (const t of toolsWithMeta) {
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }

  const sortedCats = catRows
    .slice()
    .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
    .map((c) => ({ ...(c as unknown as Category), toolCount: counts.get(c.id as number) ?? 0 }));

  const bySlug = new Map(toolsWithMeta.map((t) => [t.slug, t]));
  const byId = new Map(toolsWithMeta.map((t) => [t.id, t]));

  const featured = toolsWithMeta
    .filter((t) => t.featured && t.status === "active")
    .slice(0, 12);

  const recent = toolsWithMeta
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  return {
    tools: toolsWithMeta,
    bySlug,
    byId,
    categories: sortedCats,
    subcategories: subRows as unknown as Subcategory[],
    total: toolsWithMeta.length,
    featured,
    recent,
  };
}

let cache: Catalog | null = null;

export function getCatalog(): Catalog {
  if (cache) return cache;

  if (DB_IS_FILE) {
    try {
      const catRows = db.select().from(categories).all() as unknown as RawRow[];
      const subRows = db.select().from(subcategories).all() as unknown as RawRow[];
      const toolRows = db.select().from(tools).all() as unknown as RawRow[];
      cache = buildCatalog(catRows, subRows, toolRows);
      return cache;
    } catch {
      // broken/unavailable db file → fall through to bundled JSON
    }
  }

  // Serverless fallback: the catalog JSON is bundled at build time.
  const j = catalogJson as unknown as {
    categories: RawRow[];
    subcategories: RawRow[];
    tools: RawRow[];
  };
  cache = buildCatalog(j.categories, j.subcategories, j.tools);
  return cache;
}

export function invalidateCatalog() {
  cache = null;
}

export function getToolBySlug(slug: string): ToolWithMeta | null {
  return getCatalog().bySlug.get(slug) ?? null;
}

export function needsReviewCount(): number {
  if (!DB_IS_FILE) return 0;
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(tools)
      .where(eq(tools.status, "needs_review"))
      .all()[0]?.n ?? 0
  );
}

export function latestLinkChecks(limit = 20) {
  if (!DB_IS_FILE) return [];
  return db
    .select()
    .from(linkChecks)
    .orderBy(desc(linkChecks.checkedAt))
    .limit(limit)
    .all();
}
