"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { slugify } from "@/lib/slug";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

function splitSlugs(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function after(slug: string) {
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath(`/collections/${slug}`, "page");
}

export async function upsertCollectionAction(formData: FormData) {
  await requireCatalog();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const slug = slugify(String(formData.get("slug") ?? "").trim() || title);
  const tagline = String(formData.get("tagline") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "").trim().slice(0, 800);
  const emoji = String(formData.get("emoji") ?? "").trim().slice(0, 8) || "📦";
  const sortOrder = Math.round(Number(formData.get("sortOrder") ?? 0) || 0);
  const active = formData.get("active") === "on";

  const catalog = getCatalog();
  const tools = splitSlugs(String(formData.get("tools") ?? ""))
    .filter((value) => catalog.bySlug.has(value))
    .slice(0, 60);

  if (!slug || !title) redirect("/admin/collections?error=validation");

  const now = Date.now();
  const existing = (
    await db.select({ id: collections.id }).from(collections).where(eq(collections.slug, slug)).limit(1)
  )[0];
  if (existing) {
    await db
      .update(collections)
      .set({
        title,
        tagline,
        description,
        emoji,
        tools: JSON.stringify(tools),
        sortOrder,
        active,
        updatedAt: now,
      })
      .where(eq(collections.id, existing.id));
  } else {
    await db.insert(collections).values({
      slug,
      title,
      tagline,
      description,
      emoji,
      tools: JSON.stringify(tools),
      sortOrder,
      active,
      createdAt: now,
      updatedAt: now,
    });
  }
  await logAudit("collection.upsert", `collection:${slug}`, `${title} · ${tools.length} tools`);
  after(slug);
  redirect("/admin/collections?ok=saved");
}

export async function deleteCollectionAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    const row = (
      await db.select({ slug: collections.slug }).from(collections).where(eq(collections.id, id)).limit(1)
    )[0];
    await db.delete(collections).where(eq(collections.id, id));
    await logAudit("collection.delete", `collection:${row?.slug ?? id}`, "Deleted DB override/entry");
    if (row) after(row.slug);
  }
  redirect("/admin/collections?ok=deleted");
}
