"use server";

import { cookies } from "next/headers";
import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { submissions, tools, feedback, linkChecks } from "@/db/schema";
import { ADMIN_COOKIE, adminToken, checkLoginRateLimit, isAdmin, safeEqual } from "@/lib/admin";
import { safeHttpUrl } from "@/lib/url-check";
import { getCatalog, invalidateCatalog, refreshCatalogFromDb, normalizeUrlKey } from "@/lib/data";
import { DB_IS_REMOTE } from "@/db/client";
import { invalidateSearchIndex } from "@/lib/search";
import { generateUniqueSlug } from "@/lib/tools-service";
import { slugify } from "@/lib/slug";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin");
}

async function touch() {
  invalidateCatalog();
  invalidateSearchIndex();
  // Remote DB: repopulate the catalog cache from the database so the next
  // render already includes this mutation (the bundled JSON is stale).
  if (DB_IS_REMOTE) await refreshCatalogFromDb();
  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/categories");
  revalidatePath("/admin/tools");
  // Detail/category/stack pages run on ISR (revalidate = 120) and self-heal;
  // the pattern-based revalidation keeps them from lagging behind too.
  revalidatePath("/tools/[slug]", "page");
  revalidatePath("/categories/[slug]", "page");
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
  return safeHttpUrl(s);
}

export async function loginAction(formData: FormData) {
  const token = adminToken();
  const provided = String(formData.get("token") ?? "");
  if (!token) {
    // No ADMIN_TOKEN configured: fail closed instead of accepting a default.
    redirect("/admin?error=not_configured");
  }
  if (!(await checkLoginRateLimit())) {
    redirect("/admin?error=rate_limited");
  }
  if (provided && safeEqual(provided, token)) {
    const store = await cookies();
    const digest = createHash("sha256").update(`alltools:${provided}`).digest("hex");
    store.set(ADMIN_COOKIE, digest, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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
    installCommand: String(formData.get("installCommand") ?? "").trim().slice(0, 300) || null,
  });

  if (!parsed.success || !url || !name || !description || !categoryId) {
    redirect(`/admin/tools${id ? `/${id}` : "/new"}?error=validation`);
  }

  // A subcategory from another category would place the tool under a chip
  // that never shows it — validate the pairing, not just the id.
  const catalog = getCatalog();
  if (subcategoryId) {
    const sub = catalog.subcategories.find((s) => s.id === subcategoryId);
    if (!sub || sub.categoryId !== categoryId) {
      redirect(`/admin/tools${id ? `/${id}` : "/new"}?error=subcategory`);
    }
  }

  // Duplicate website URLs create two listings for the same tool.
  const dup = [...catalog.byUrl.entries()].find(
    ([existingUrl, existingId]) => existingUrl === normalizeUrlKey(url) && existingId !== id,
  );
  if (dup) {
    redirect(`/admin/tools${id ? `/${id}` : "/new"}?error=duplicate`);
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
    installCommand: String(formData.get("installCommand") ?? "").trim().slice(0, 300) || null,
    platforms: JSON.stringify(platforms),
    languages: JSON.stringify(commaList(formData.get("languages"))),
    frameworks: JSON.stringify(commaList(formData.get("frameworks"))),
    useCases: JSON.stringify(
      String(formData.get("useCases") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
    pros: JSON.stringify(
      String(formData.get("pros") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5),
    ),
    cons: JSON.stringify(
      String(formData.get("cons") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5),
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
  await touch();
  redirect("/admin/tools?saved=1");
}

export async function deleteToolAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    // link_checks rows reference the tool (FK enforced locally) — clear them first
    await db.delete(linkChecks).where(eq(linkChecks.toolId, id));
    await db.delete(tools).where(eq(tools.id, id));
    await touch();
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
    await touch();
  }
}

export async function approveSubmissionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const sub = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .get();
  if (!sub || sub.status !== "pending") redirect("/admin/submissions");

  // The submission's category must resolve to a real category — approving
  // without one would silently drop the tool from the directory, so leave
  // the submission pending and surface the problem instead.
  const cat = getCatalog().categories.find((c) => c.slug === sub.categorySlug);
  if (!cat) redirect(`/admin/submissions?error=category&slug=${sub.categorySlug}`);

  const now = Date.now();

  // Defense in depth: the submit form validates, but anything can end up in
  // the table. Never render a non-http(s) href, never approve a URL that is
  // already listed.
  const url = safeHttpUrl(sub.url);
  if (!url) redirect("/admin/submissions?error=url");
  if (getCatalog().byUrl.has(url)) {
    redirect("/admin/submissions?error=duplicate");
  }

  try {
    await db.insert(tools).values({
      name: sub.name,
      slug: generateUniqueSlug(slugify(sub.name)),
      url,
      description: sub.description,
      logo: (() => {
        try {
          return new URL(url).hostname;
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
  } catch {
    // Most likely a duplicate slug raced in on another serverless instance.
    redirect("/admin/submissions?error=save");
  }

  await db
    .update(submissions)
    .set({ status: "approved", reviewedAt: now })
    .where(eq(submissions.id, id));
  await touch();
  redirect("/admin/submissions?approved=1");
}

export async function rejectSubmissionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  // Only pending submissions are actionable — re-rejecting an
  // already-reviewed row would overwrite the original decision's timestamp.
  await db
    .update(submissions)
    .set({ status: "rejected", reviewedAt: Date.now() })
    .where(eq(submissions.id, id));
  redirect("/admin/submissions?rejected=1");
}

export async function resolveFeedbackAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  await db
    .update(feedback)
    .set({ status: "resolved", resolvedAt: Date.now() })
    .where(eq(feedback.id, id));
  revalidatePath("/admin");
}

export async function dismissFeedbackAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  await db
    .update(feedback)
    .set({ status: "dismissed", resolvedAt: Date.now() })
    .where(eq(feedback.id, id));
  revalidatePath("/admin");
}
