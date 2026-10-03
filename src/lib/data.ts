import { db, DB_ACTIVE, DB_IS_REMOTE } from "@/db/client";
import { categories, subcategories, toolClicks, tools } from "@/db/schema";
import type { Category, Subcategory, Tool } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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
  // Outbound-click counters from tool_clicks (bundled JSON carries them
  // too; rows without the fields default to 0).
  clicks: number;
  weeklyClicks: number;
};

export interface Catalog {
  tools: ToolWithMeta[];
  bySlug: Map<string, ToolWithMeta>;
  byId: Map<number, ToolWithMeta>;
  byUrl: Map<string, number>; // normalized website URL → tool id (duplicate detection)
  categories: (Category & { toolCount: number })[];
  subcategories: Subcategory[];
  total: number;
  featured: ToolWithMeta[];
  recent: ToolWithMeta[];
  // Active tools with real outbound clicks, weekly-first ranking.
  popular: ToolWithMeta[];
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
      clicks: Number(t.clicks ?? 0),
      weeklyClicks: Number(t.weeklyClicks ?? 0),
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
  const byUrl = new Map(toolsWithMeta.map((t) => [t.url, t.id]));

  const featured = toolsWithMeta
    .filter((t) => t.featured && t.status === "active")
    .slice(0, 12);

  const recent = toolsWithMeta
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  // Popularity pipeline: real outbound clicks, weekly bucket first, then
  // all-time. Empty until visitors actually click — the homepage hides the
  // section until there is something honest to show.
  const popular = toolsWithMeta
    .filter((t) => t.status === "active" && t.clicks > 0)
    .sort(
      (a, b) =>
        b.weeklyClicks - a.weeklyClicks ||
        b.clicks - a.clicks ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 8);

  return {
    tools: toolsWithMeta,
    bySlug,
    byId,
    byUrl,
    categories: sortedCats,
    subcategories: subRows as unknown as Subcategory[],
    total: toolsWithMeta.length,
    featured,
    recent,
    popular,
  };
}

let cache: Catalog | null = null;
// When the cached catalog was built (0 = invalid). Remote mode refreshes the
// cache in the background once it is older than CATALOG_TTL_MS — without this,
// a serverless instance would serve its first DB snapshot forever unless the
// mutation happened to run on that same instance.
let cacheAt = 0;
let refreshInFlight = false;
const CATALOG_TTL_MS = 30_000;

function catalogFromBundledJson(): Catalog {
  // Serverless fallback: the catalog JSON is bundled at build time.
  const j = catalogJson as unknown as {
    categories: RawRow[];
    subcategories: RawRow[];
    tools: RawRow[];
  };
  return buildCatalog(j.categories, j.subcategories, j.tools);
}

// Attach outbound-click counters onto tool rows before catalog building.
// The click table is separate from tools, so both catalog sources merge it
// in here (bundled JSON rows already carry the fields from export time).
function attachClicks(toolRows: RawRow[], clickRows: RawRow[]) {
  const byslug = new Map<string, { clicks: number; weeklyClicks: number }>();
  for (const c of clickRows) {
    byslug.set(String(c.slug), {
      clicks: Number(c.clicks ?? 0),
      weeklyClicks: Number(c.weeklyClicks ?? 0),
    });
  }
  for (const t of toolRows) {
    const c = byslug.get(String(t.slug));
    t.clicks = c?.clicks ?? 0;
    t.weeklyClicks = c?.weeklyClicks ?? 0;
  }
}

// Rebuild the in-memory catalog from the database. Awaited by admin
// mutations so the next rendered page already reflects them.
export async function refreshCatalogFromDb(): Promise<void> {
  const catRows = (await db.select().from(categories)) as unknown as RawRow[];
  const subRows = (await db.select().from(subcategories)) as unknown as RawRow[];
  const toolRows = (await db.select().from(tools)) as unknown as RawRow[];
  let clickRows: RawRow[] = [];
  try {
    clickRows = (await db.select().from(toolClicks)) as unknown as RawRow[];
  } catch {
    // click table missing on a stale remote schema — popularity stays 0
  }
  attachClicks(toolRows, clickRows);
  cache = buildCatalog(catRows, subRows, toolRows);
  cacheAt = Date.now();
  const { invalidateSearchIndex } = await import("./search");
  invalidateSearchIndex();
}

async function rehydrateCatalogFromDb(): Promise<void> {
  try {
    await refreshCatalogFromDb();
  } catch {
    // Remote DB unreachable right now — keep the current snapshot and let
    // the TTL schedule the next attempt.
    cacheAt = Date.now();
  } finally {
    refreshInFlight = false;
  }
}

function kickCatalogRefresh() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  // Stamp now so concurrent renders don't pile up more refresh attempts
  // while this one is in flight (or right after a failure).
  cacheAt = Date.now();
  void rehydrateCatalogFromDb();
}

export function getCatalog(): Catalog {
  // Remote DB: getCatalog is synchronous and queries cannot await, so serve
  // the current snapshot (bundled JSON on a cold instance) and swap in the
  // database-backed catalog in the background, refreshed every TTL.
  if (DB_IS_REMOTE) {
    if (!cache) cache = catalogFromBundledJson();
    if (Date.now() - cacheAt >= CATALOG_TTL_MS) kickCatalogRefresh();
    return cache;
  }

  if (cache) return cache;

  if (DB_ACTIVE) {
    try {
      const catRows = db.select().from(categories).all() as unknown as RawRow[];
      const subRows = db.select().from(subcategories).all() as unknown as RawRow[];
      const toolRows = db.select().from(tools).all() as unknown as RawRow[];
      let clickRows: RawRow[] = [];
      try {
        clickRows = db.select().from(toolClicks).all() as unknown as RawRow[];
      } catch {
        // click table missing on a stale local schema — popularity stays 0
      }
      attachClicks(toolRows, clickRows);
      cache = buildCatalog(catRows, subRows, toolRows);
      cacheAt = Date.now();
      return cache;
    } catch {
      // broken/unavailable db file → fall through to bundled JSON
    }
  }

  cache = catalogFromBundledJson();
  return cache;
}

export function invalidateCatalog() {
  cache = null;
  cacheAt = 0;
}

export function getToolBySlug(slug: string): ToolWithMeta | null {
  return getCatalog().bySlug.get(slug) ?? null;
}

export async function needsReviewCount(): Promise<number> {
  if (!DB_ACTIVE) return 0;
  try {
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(tools)
      .where(eq(tools.status, "needs_review"));
    return rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}
