"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, DB_IS_REMOTE } from "@/db/client";
import { categories, subcategories, tools } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { invalidateCatalog, refreshCatalogFromDb } from "@/lib/data";
import { slugify } from "@/lib/slug";

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
  revalidatePath("/categories");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/admin/categories");
}

export async function updateCategoryAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  const icon = String(formData.get("icon") ?? "").trim().slice(0, 40) || "Box";
  const sortOrder = Math.round(Number(formData.get("sortOrder") ?? 0) || 0);
  const homeOrderRaw = String(formData.get("homeOrder") ?? "").trim();
  const homeOrder = homeOrderRaw ? Math.round(Number(homeOrderRaw)) || 0 : null;
  if (!id || !name) redirect("/admin/categories?error=validation");

  await db
    .update(categories)
    .set({ name, description, icon, sortOrder, homeOrder })
    .where(eq(categories.id, id));
  await logAudit("category.update", `category:${id}`, `Updated ${name}`);
  await after();
  redirect("/admin/categories?ok=saved");
}

export async function createSubcategoryAction(formData: FormData) {
  await requireCatalog();
  const categoryId = Number(formData.get("categoryId") ?? 0);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const sortOrder = Math.round(Number(formData.get("sortOrder") ?? 0) || 0);
  if (!categoryId || !name) redirect("/admin/categories?error=validation");

  const base = slugify(name) || "sub";
  const existing = await db
    .select({ slug: subcategories.slug })
    .from(subcategories)
    .where(eq(subcategories.categoryId, categoryId));
  const used = new Set(existing.map((e) => e.slug));
  let slug = base;
  let i = 2;
  while (used.has(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }

  await db.insert(subcategories).values({ categoryId, slug, name, sortOrder });
  await logAudit("subcategory.create", `category:${categoryId}`, `Created ${name} (${slug})`);
  await after();
  redirect("/admin/categories?ok=sub_created");
}

export async function updateSubcategoryAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const sortOrder = Math.round(Number(formData.get("sortOrder") ?? 0) || 0);
  if (!id || !name) redirect("/admin/categories?error=validation");

  await db.update(subcategories).set({ name, sortOrder }).where(eq(subcategories.id, id));
  await logAudit("subcategory.update", `subcategory:${id}`, `Updated ${name}`);
  await after();
  redirect("/admin/categories?ok=sub_updated");
}

export async function deleteSubcategoryAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (!id) redirect("/admin/categories?error=validation");

  const used = await db
    .select({ n: sql<number>`count(*)` })
    .from(tools)
    .where(eq(tools.subcategoryId, id));
  if (Number(used[0]?.n ?? 0) > 0) {
    redirect("/admin/categories?error=sub_in_use");
  }

  await db.delete(subcategories).where(eq(subcategories.id, id));
  await logAudit("subcategory.delete", `subcategory:${id}`, "Deleted empty subcategory");
  await after();
  redirect("/admin/categories?ok=sub_deleted");
}
