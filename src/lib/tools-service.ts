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
