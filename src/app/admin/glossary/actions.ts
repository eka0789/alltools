"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { glossaryTerms } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { GLOSSARY_CATEGORY_ORDER, type GlossaryCategory } from "@/data/glossary";
import { getCatalog } from "@/lib/data";
import { slugify } from "@/lib/slug";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

function splitList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function after(slug: string) {
  revalidatePath("/admin/glossary");
  revalidatePath("/glossary");
  revalidatePath(`/glossary/${slug}`, "page");
}

export async function upsertGlossaryAction(formData: FormData) {
  await requireCatalog();
  const term = String(formData.get("term") ?? "").trim().slice(0, 80);
  const slug = slugify(String(formData.get("slug") ?? "").trim() || term);
  const categoryRaw = String(formData.get("category") ?? "");
  const short = String(formData.get("short") ?? "").trim().slice(0, 300);
  const definition = String(formData.get("definition") ?? "").trim().slice(0, 4000);
  const example = String(formData.get("example") ?? "").trim().slice(0, 500) || null;
  const active = formData.get("active") === "on";
  const category = (GLOSSARY_CATEGORY_ORDER as string[]).includes(categoryRaw)
    ? (categoryRaw as GlossaryCategory)
    : null;

  const catalog = getCatalog();
  const relatedTools = splitList(String(formData.get("relatedTools") ?? "")).filter((value) =>
    catalog.bySlug.has(value),
  );
  const relatedTerms = splitList(String(formData.get("relatedTerms") ?? "")).map((value) =>
    slugify(value),
  );

  if (!term || !slug || !short || !definition || !category) {
    redirect("/admin/glossary?error=validation");
  }

  const now = Date.now();
  const values = {
    term,
    category,
    short,
    definition,
    example,
    relatedTools: JSON.stringify(relatedTools),
    relatedTerms: JSON.stringify(relatedTerms),
    active,
    updatedAt: now,
  };

  const existing = (
    await db.select({ id: glossaryTerms.id }).from(glossaryTerms).where(eq(glossaryTerms.slug, slug)).limit(1)
  )[0];
  if (existing) {
    await db.update(glossaryTerms).set(values).where(eq(glossaryTerms.id, existing.id));
  } else {
    await db.insert(glossaryTerms).values({ slug, ...values, createdAt: now });
  }
  await logAudit("glossary.upsert", `glossary:${slug}`, `${term} (${category})`);
  after(slug);
  redirect("/admin/glossary?ok=saved");
}

export async function deleteGlossaryAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    const row = (
      await db.select({ slug: glossaryTerms.slug }).from(glossaryTerms).where(eq(glossaryTerms.id, id)).limit(1)
    )[0];
    await db.delete(glossaryTerms).where(eq(glossaryTerms.id, id));
    await logAudit("glossary.delete", `glossary:${row?.slug ?? id}`, "Deleted DB entry/override");
    if (row) after(row.slug);
  }
  redirect("/admin/glossary?ok=deleted");
}
