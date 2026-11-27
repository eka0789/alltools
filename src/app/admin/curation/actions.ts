"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db, DB_IS_REMOTE } from "@/db/client";
import { categories, tools } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { invalidateCatalog, refreshCatalogFromDb } from "@/lib/data";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

async function after() {
  invalidateCatalog();
  if (DB_IS_REMOTE) {
    try {
      await refreshCatalogFromDb();
    } catch {
      // TTL refresh will catch up
    }
  }
  revalidatePath("/");
  revalidatePath("/admin/curation");
}

export async function moveFeaturedAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) {
    redirect("/admin/curation?error=invalid");
  }

  const rows = await db
    .select({ id: tools.id, order: tools.featuredOrder })
    .from(tools)
    .where(and(eq(tools.featured, true), isNull(tools.deletedAt)));
  const sorted = rows
    .slice()
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);

  const index = sorted.findIndex((row) => row.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) {
    redirect("/admin/curation?error=edge");
  }

  [sorted[index], sorted[swapIndex]] = [sorted[swapIndex], sorted[index]];
  const now = Date.now();
  for (let position = 0; position < sorted.length; position += 1) {
    await db
      .update(tools)
      .set({ featuredOrder: position, updatedAt: now })
      .where(eq(tools.id, sorted[position].id));
  }
  await logAudit("curation.featured", `tool:${id}`, `Moved ${direction}`);
  await after();
  redirect("/admin/curation?ok=moved");
}

export async function moveHomeCategoryAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) {
    redirect("/admin/curation?error=invalid");
  }

  const rows = await db
    .select({ id: categories.id, order: categories.homeOrder })
    .from(categories)
    .where(isNotNull(categories.homeOrder));
  const sorted = rows
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id);
  const index = sorted.findIndex((row) => row.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) {
    redirect("/admin/curation?error=edge");
  }

  [sorted[index], sorted[swapIndex]] = [sorted[swapIndex], sorted[index]];
  const now = Date.now();
  for (let position = 0; position < sorted.length; position += 1) {
    await db
      .update(categories)
      .set({ homeOrder: position + 1 })
      .where(eq(categories.id, sorted[position].id));
  }
  void now;
  await logAudit("curation.category", `category:${id}`, `Moved ${direction}`);
  await after();
  redirect("/admin/curation?ok=moved");
}
