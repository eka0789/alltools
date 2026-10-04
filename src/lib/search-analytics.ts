import { db, DB_ACTIVE } from "@/db/client";
import { searchQueries } from "@/db/schema";
import { and, gte, sql } from "drizzle-orm";

// Best-effort analytics over the anonymous search-query log. Every call
// degrades to a no-op when the DB is unavailable — analytics must never
// break a page render.

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeLoggedQuery(q: string): string | null {
  const cleaned = q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);
  return cleaned.length >= 2 ? cleaned : null;
}

// Called from the /search server component for intentional searches
// (autocomplete keystrokes hit /api/search and are deliberately not logged).
export async function logSearchQuery(rawQuery: string, resultCount: number): Promise<void> {
  if (!DB_ACTIVE) return;
  const query = normalizeLoggedQuery(rawQuery);
  if (!query) return;
  try {
    await db.insert(searchQueries).values({
      query,
      resultCount: Math.max(0, Math.min(resultCount, 99999)),
      createdAt: Date.now(),
    });
  } catch {
    // best-effort
  }
}

async function topQueries(
  days: number,
  limit: number,
  minHits: number,
  withResults: boolean,
): Promise<{ query: string; hits: number }[]> {
  if (!DB_ACTIVE) return [];
  try {
    const since = Date.now() - days * DAY_MS;
    const rows = await db
      .select({ query: searchQueries.query, hits: sql<number>`count(*)` })
      .from(searchQueries)
      .where(
        and(
          gte(searchQueries.createdAt, since),
          withResults ? gte(searchQueries.resultCount, 1) : gte(searchQueries.resultCount, 0),
        ),
      )
      .groupBy(searchQueries.query)
      .having(sql`count(*) >= ${minHits}${withResults ? "" : ` and sum(case when ${searchQueries.resultCount} = 0 then 1 else 0 end) >= 1`}`)
      .orderBy(sql`count(*) desc`)
      .limit(limit);
    return rows.map((r) => ({ query: r.query, hits: Number(r.hits) }));
  } catch {
    return [];
  }
}

// Queries that returned results — homepage/search "trending" chips.
export function trendingQueries(days = 30, limit = 8) {
  return topQueries(days, limit, 3, true);
}

// Queries with zero results — the free curation roadmap.
export function noResultQueries(days = 30, limit = 10) {
  return topQueries(days, limit, 1, false);
}
