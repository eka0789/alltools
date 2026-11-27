import { asc } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { collections, glossaryTerms } from "@/db/schema";
import { COLLECTIONS, type Collection } from "@/data/collections";
import {
  GLOSSARY,
  type GlossaryCategory,
  type GlossaryTerm,
} from "@/data/glossary";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";

// DB-backed editorial content merged over the committed seed files. Admin
// rows override a static entry with the same slug; new slugs are appended.
// A DB failure degrades cleanly to the static data.

function parseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function rowToCollection(row: typeof collections.$inferSelect): Collection {
  return {
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    emoji: row.emoji,
    tools: parseArray(row.tools),
  };
}

export function rowToGlossaryTerm(row: typeof glossaryTerms.$inferSelect): GlossaryTerm {
  return {
    slug: row.slug,
    term: row.term,
    category: row.category as GlossaryCategory,
    short: row.short,
    definition: row.definition,
    example: row.example ?? undefined,
    relatedTools: parseArray(row.relatedTools),
    relatedTerms: parseArray(row.relatedTerms),
  };
}

export async function listCollectionRows() {
  if (!DB_ACTIVE) return [];
  try {
    await ensureAdminSchema();
    return await db.select().from(collections).orderBy(asc(collections.sortOrder));
  } catch {
    return [];
  }
}

export async function listGlossaryRows() {
  if (!DB_ACTIVE) return [];
  try {
    await ensureAdminSchema();
    return await db.select().from(glossaryTerms).orderBy(asc(glossaryTerms.term));
  } catch {
    return [];
  }
}

export async function getAllCollections(): Promise<Collection[]> {
  const rows = await listCollectionRows();
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const result: Collection[] = [];
  const seen = new Set<string>();

  for (const base of COLLECTIONS) {
    const override = bySlug.get(base.slug);
    seen.add(base.slug);
    if (override) {
      if (override.active) result.push(rowToCollection(override));
    } else {
      result.push(base);
    }
  }
  for (const row of rows) {
    if (row.active && !seen.has(row.slug)) {
      result.push(rowToCollection(row));
      seen.add(row.slug);
    }
  }
  return result;
}

export async function getAllGlossaryTerms(): Promise<GlossaryTerm[]> {
  const rows = await listGlossaryRows();
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const result: GlossaryTerm[] = [];
  const seen = new Set<string>();

  for (const base of GLOSSARY) {
    const override = bySlug.get(base.slug);
    seen.add(base.slug);
    if (override) {
      if (override.active) result.push(rowToGlossaryTerm(override));
    } else {
      result.push(base);
    }
  }
  for (const row of rows) {
    if (row.active && !seen.has(row.slug)) {
      result.push(rowToGlossaryTerm(row));
      seen.add(row.slug);
    }
  }
  return result;
}
