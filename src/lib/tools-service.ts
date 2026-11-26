import { db } from "@/db/client";
import { tools } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCatalog, invalidateCatalog } from "./data";
import { invalidateSearchIndex } from "./search";
import { slugify } from "./slug";

export function generateUniqueSlug(name: string, excludeId?: number): string {
  const base = slugify(name) || "tool";
  let slug = base;
  let n = 2;
  while (getCatalog().bySlug.has(slug)) {
    const existing = getCatalog().bySlug.get(slug);
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${n++}`;
  }
  return slug;
}

// Soft-deleted tools stay in the table and keep holding their unique slug,
// so slug generation for new/edited tools must consider every row — not just
// the active catalog — or the INSERT hits the unique index and 500s.
export async function generateUniqueSlugIncludingTrash(
  name: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(name) || "tool";
  const used = new Set<string>();
  try {
    const rows = await db.select({ id: tools.id, slug: tools.slug }).from(tools);
    for (const row of rows) {
      if (row.id !== excludeId) used.add(row.slug);
    }
  } catch {
    for (const [slug, tool] of getCatalog().bySlug) {
      if (tool.id !== excludeId) used.add(slug);
    }
  }
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export function touchData() {
  invalidateCatalog();
  invalidateSearchIndex();
}

export async function markToolStatus(
  id: number,
  status: "active" | "needs_review" | "deprecated",
) {
  await db
    .update(tools)
    .set({ status, updatedAt: Date.now() })
    .where(eq(tools.id, id));
  touchData();
}
