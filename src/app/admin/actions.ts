"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { submissions, tools } from "@/db/schema";
import { ADMIN_COOKIE, adminToken, isAdmin } from "@/lib/admin";
import { getCatalog, invalidateCatalog } from "@/lib/data";
import { invalidateSearchIndex } from "@/lib/search";
import { generateUniqueSlug } from "@/lib/tools-service";
import { slugify } from "@/lib/slug";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin");
}

function touch() {
  invalidateCatalog();
  invalidateSearchIndex();
  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/tools");
}

const toolSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  url: z.string().url(),
  description: z.string().min(1).max(500),
  categoryId: z.coerce.number().int().positive(),
  subcategoryId: z.coerce.number().int().positive().nullable().optional(),
  pricing: z.enum(["free", "freemium", "paid"]),
  status: z.enum(["active", "needs_review", "deprecated"]),
  githubUrl: z.string().url().nullable().optional(),
  documentationUrl: z.string().url().nullable().optional(),
});

function commaList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function optUrl(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  try {
    return new URL(s).toString();
  } catch {
    return null;
  }
}

export async function loginAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (token && token === adminToken()) {
    const store = await cookies();
    store.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect("/admin");
  }
  redirect("/admin?error=1");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin");
}

export async function saveToolAction(formData: FormData) {
  await requireAdmin();

  const idRaw = String(formData.get("id") ?? "");
  const id = idRaw ? Number(idRaw) : undefined;
  const name = String(formData.get("name") ?? "").trim();
  const url = optUrl(formData.get("url"));
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = Number(formData.get("category") ?? 0);
  const subRaw = String(formData.get("subcategory") ?? "");
  const subcategoryId = subRaw ? Number(subRaw) : null;

  const parsed = toolSchema.safeParse({
    name,
    slug: slugify(String(formData.get("slug") ?? "") || name),
    url,
    description,
    categoryId,
    subcategoryId,
    pricing: String(formData.get("pricing") ?? "free"),
    status: String(formData.get("status") ?? "active"),
    githubUrl: optUrl(formData.get("githubUrl")),
    documentationUrl: optUrl(formData.get("documentationUrl")),
  });

  if (!parsed.success || !url || !name || !description || !categoryId) {
    redirect(`/admin/tools${id ? `/${id}` : "/new"}?error=validation`);
  }

  const slug = generateUniqueSlug(parsed.data.slug || name, id);
  const now = Date.now();

  const platforms = ["web", "desktop", "cli", "mobile", "extension"].filter((p) =>
    formData.get(`platform-${p}`) === "on",
  );

  const values = {
    name,
    slug,
    url,
    description,
    categoryId,
    subcategoryId,
    tags: JSON.stringify(commaList(formData.get("tags")).map((t) => t.toLowerCase())),
    pricing: parsed.data.pricing,
    openSource: formData.get("openSource") === "on",
    selfHosted: formData.get("selfHosted") === "on",
    githubUrl: optUrl(formData.get("githubUrl")),
    documentationUrl: optUrl(formData.get("documentationUrl")),
    platforms: JSON.stringify(platforms),
    languages: JSON.stringify(commaList(formData.get("languages"))),
    frameworks: JSON.stringify(commaList(formData.get("frameworks"))),
    useCases: JSON.stringify(
      String(formData.get("useCases") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
    alternatives: JSON.stringify(commaList(formData.get("alternatives"))),
    relatedTools: JSON.stringify(commaList(formData.get("relatedTools"))),
    status: parsed.data.status,
    verified: formData.get("verified") === "on",
    lastVerifiedAt: formData.get("verified") === "on" ? now : null,
    featured: formData.get("featured") === "on",
    updatedAt: now,
  };

  if (id) {
    await db.update(tools).set(values).where(eq(tools.id, id));
  } else {
    await db.insert(tools).values({ ...values, createdAt: now });
  }
  touch();
  redirect("/admin/tools?saved=1");
}

export async function deleteToolAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db.delete(tools).where(eq(tools.id, id));
    touch();
  }
  redirect("/admin/tools?deleted=1");
}

export async function toggleFeaturedAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const tool = getCatalog().byId.get(id);
  if (tool) {
    await db
      .update(tools)
      .set({ featured: !tool.featured, updatedAt: Date.now() })
      .where(eq(tools.id, id));
    touch();
  }
}

export async function approveSubmissionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const all = await db.select().from(submissions).all();
  const sub = all.find((s) => s.id === id);
  if (!sub || sub.status !== "pending") redirect("/admin/submissions");

  const cat = getCatalog().categories.find((c) => c.slug === sub.categorySlug);
  const now = Date.now();

  if (cat) {
    await db.insert(tools).values({
      name: sub.name,
      slug: generateUniqueSlug(slugify(sub.name)),
      url: sub.url,
      description: sub.description,
      logo: (() => {
        try {
          return new URL(sub.url).hostname;
        } catch {
          return null;
        }
      })(),
      categoryId: cat.id,
      tags: sub.tags,
      pricing: sub.pricing,
      githubUrl: sub.githubUrl,
      documentationUrl: sub.documentationUrl,
      createdAt: now,
      updatedAt: now,
      verified: false,
    });
  }

  await db
    .update(submissions)
    .set({ status: "approved", reviewedAt: now })
    .where(eq(submissions.id, id));
  touch();
  redirect("/admin/submissions?approved=1");
}

export async function rejectSubmissionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  await db
    .update(submissions)
    .set({ status: "rejected", reviewedAt: Date.now() })
    .where(eq(submissions.id, id));
  redirect("/admin/submissions?rejected=1");
}
