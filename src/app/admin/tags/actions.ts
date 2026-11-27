"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { db, DB_IS_REMOTE } from "@/db/client";
import { tools } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { invalidateCatalog, refreshCatalogFromDb } from "@/lib/data";
import { invalidateSearchIndex } from "@/lib/search";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function rewriteTags(
  transform: (tags: string[]) => string[] | null,
): Promise<number> {
  const rows = await db
    .select({ id: tools.id, tags: tools.tags })
    .from(tools)
    .where(isNull(tools.deletedAt));

  let changed = 0;
  for (const row of rows) {
    let list: string[];
    try {
      const parsed = JSON.parse(row.tags);
      if (!Array.isArray(parsed)) continue;
      list = parsed.filter((value): value is string => typeof value === "string");
    } catch {
      continue;
    }
    const next = transform(list);
    if (!next) continue;
    const deduped = [...new Set(next)];
    if (JSON.stringify(deduped) === JSON.stringify(list)) continue;
    await db
      .update(tools)
      .set({ tags: JSON.stringify(deduped), updatedAt: Date.now() })
      .where(eq(tools.id, row.id));
    changed += 1;
  }

  if (changed > 0) {
    invalidateCatalog();
    invalidateSearchIndex();
    if (DB_IS_REMOTE) {
      try {
        await refreshCatalogFromDb();
      } catch {
        // TTL refresh will catch up
      }
    }
  }
  return changed;
}

export async function renameTagAction(formData: FormData) {
  await requireCatalog();
  const from = normalizeTag(String(formData.get("from") ?? ""));
  const to = normalizeTag(String(formData.get("to") ?? ""));
  if (!from || !to || from === to) redirect("/admin/tags?error=validation");

  // Renaming onto an existing tag merges the two (deduped upstream).
  const changed = await rewriteTags((tags) =>
    tags.includes(from) ? tags.map((tag) => (tag === from ? to : tag)) : null,
  );
  await logAudit("tag.rename", `tag:${from}`, `→ ${to} (${changed} tools)`);
  revalidatePath("/admin/tags");
  revalidatePath("/tags");
  redirect(`/admin/tags?ok=renamed-${changed}`);
}

export async function deleteTagAction(formData: FormData) {
  await requireCatalog();
  const tag = normalizeTag(String(formData.get("tag") ?? ""));
  if (!tag) redirect("/admin/tags?error=validation");
  const changed = await rewriteTags((tags) =>
    tags.includes(tag) ? tags.filter((value) => value !== tag) : null,
  );
  await logAudit("tag.delete", `tag:${tag}`, `Removed from ${changed} tools`);
  revalidatePath("/admin/tags");
  revalidatePath("/tags");
  redirect(`/admin/tags?ok=deleted-${changed}`);
}
