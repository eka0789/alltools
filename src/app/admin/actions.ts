"use server";

import { cookies } from "next/headers";
import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, DB_IS_REMOTE } from "@/db/client";
import { submissions, tools, feedback, linkChecks, entitlements, coupons } from "@/db/schema";
import {
  ADMIN_COOKIE,
  checkLoginRateLimit,
  getAdminIdentity,
  logAudit,
  matchAdminToken,
  roleCan,
  type AdminIdentity,
  type Capability,
} from "@/lib/admin";
import { safeHttpUrl } from "@/lib/url-check";
import { getCatalog, invalidateCatalog, refreshCatalogFromDb, normalizeUrlKey } from "@/lib/data";
import { invalidateSearchIndex } from "@/lib/search";
import { generateUniqueSlugIncludingTrash } from "@/lib/tools-service";
import { slugify } from "@/lib/slug";
// Duplicate URL check that also sees soft-deleted rows: the unique index on
// tools.url still covers the trash, so a re-add would otherwise 500.
async function findDuplicateUrl(url: string, exceptId?: number): Promise<boolean> {
  const key = normalizeUrlKey(url);
  try {
    const rows = await db.select({ id: tools.id, url: tools.url }).from(tools);
    return rows.some((row) => row.id !== exceptId && normalizeUrlKey(row.url) === key);
  } catch {
    return [...getCatalog().byUrl.entries()].some(
      ([existingUrl, existingId]) => existingUrl === key && existingId !== exceptId,
    );
  }
}

async function requireCap(capability: Capability): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, capability)) redirect("/admin?error=forbidden");
  return identity;
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

// ── Auth ────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const provided = String(formData.get("token") ?? "").trim();
  // Distinguish "not configured" from "wrong token" for the UI.
  if (!process.env.ADMIN_TOKEN?.trim() && !process.env.ADMIN_TOKENS?.trim()) {
    redirect("/admin?error=not_configured");
  }
  if (!(await checkLoginRateLimit())) redirect("/admin?error=rate_limited");
  const entry = matchAdminToken(provided);
  if (!entry) redirect("/admin?error=1");

  const store = await cookies();
  const digest = createHash("sha256").update(`alltools:${provided}`).digest("hex");
  store.set(ADMIN_COOKIE, digest, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  await logAudit("admin.login", `admin:${entry.name}`, `Signed in as ${entry.role}`);
  redirect("/admin");
}

export async function logoutAction() {
  const identity = await getAdminIdentity();
  if (identity) await logAudit("admin.logout", `admin:${identity.name}`, "Signed out");
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin");
}

// ── Tools ───────────────────────────────────────────────────────────────

export async function saveToolAction(formData: FormData) {
  await requireCap("catalog");

  const idRaw = String(formData.get("id") ?? "");
  const id = idRaw ? Number(idRaw) : undefined;
  const name = String(formData.get("name") ?? "").trim();
  const url = optUrl(formData.get("url"));
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = Number(formData.get("category") ?? 0);
  const subRaw = String(formData.get("subcategory") ?? "");
  const subcategoryId = subRaw ? Number(subRaw) : null;

  if (!url || !name || !description || !categoryId) {
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

  // Duplicate website URLs create two listings for the same tool. This
  // includes trashed rows (their unique index still applies).
  if (await findDuplicateUrl(url, id)) {
    redirect(`/admin/tools${id ? `/${id}` : "/new"}?error=duplicate`);
  }

  const slug = await generateUniqueSlugIncludingTrash(
    slugify(String(formData.get("slug") ?? "") || name),
    id,
  );
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
    pricing: String(formData.get("pricing") ?? "free"),
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
    status: String(formData.get("status") ?? "active"),
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
  await logAudit(id ? "tool.update" : "tool.create", `tool:${slug}`, `${name} (${url})`);
  await touch();
  redirect("/admin/tools?saved=1");
}

// Soft delete: the tool disappears from the public catalog and the admin
// list but stays recoverable from /admin/tools/trash.
export async function deleteToolAction(formData: FormData) {
  await requireCap("catalog");
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    const tool = getCatalog().byId.get(id);
    await db.update(tools).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(tools.id, id));
    await logAudit("tool.trash", `tool:${tool?.slug ?? id}`, `Moved to trash: ${tool?.name ?? id}`);
    await touch();
  }
  redirect("/admin/tools?deleted=1");
}

export async function restoreToolAction(formData: FormData) {
  await requireCap("catalog");
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db.update(tools).set({ deletedAt: null, updatedAt: Date.now() }).where(eq(tools.id, id));
    await logAudit("tool.restore", `tool:${id}`, "Restored from trash");
    await touch();
  }
  redirect("/admin/tools/trash?restored=1");
}

export async function purgeToolAction(formData: FormData) {
  await requireCap("catalog");
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    // link_checks rows reference the tool (FK enforced locally) — clear them first
    await db.delete(linkChecks).where(eq(linkChecks.toolId, id));
    await db.delete(tools).where(eq(tools.id, id));
    await logAudit("tool.purge", `tool:${id}`, "Permanently deleted from trash");
    await touch();
  }
  redirect("/admin/tools/trash?purged=1");
}

export async function toggleFeaturedAction(formData: FormData) {
  await requireCap("catalog");
  const id = Number(formData.get("id") ?? 0);
  const tool = getCatalog().byId.get(id);
  if (tool) {
    await db
      .update(tools)
      .set({ featured: !tool.featured, updatedAt: Date.now() })
      .where(eq(tools.id, id));
    await logAudit("tool.featured", `tool:${tool.slug}`, `${tool.featured ? "Unfeatured" : "Featured"} ${tool.name}`);
    await touch();
  }
}

const BULK_ACTIONS = new Set([
  "trash",
  "activate",
  "needs_review",
  "deprecate",
  "feature",
  "unfeature",
  "verify",
  "unverify",
  "flag_incomplete",
]);

export async function bulkToolAction(formData: FormData) {
  await requireCap("catalog");
  const ids = formData
    .getAll("ids")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  const action = String(formData.get("bulkAction") ?? "");
  if (ids.length === 0 || !BULK_ACTIONS.has(action)) {
    redirect("/admin/tools?error=bulk_empty");
  }

  const now = Date.now();
  if (action === "trash") {
    await db.update(tools).set({ deletedAt: now, updatedAt: now }).where(inArray(tools.id, ids));
  } else if (action === "activate") {
    await db.update(tools).set({ status: "active", updatedAt: now }).where(inArray(tools.id, ids));
  } else if (action === "needs_review") {
    await db.update(tools).set({ status: "needs_review", updatedAt: now }).where(inArray(tools.id, ids));
  } else if (action === "deprecate") {
    await db.update(tools).set({ status: "deprecated", updatedAt: now }).where(inArray(tools.id, ids));
  } else if (action === "feature") {
    await db.update(tools).set({ featured: true, updatedAt: now }).where(inArray(tools.id, ids));
  } else if (action === "unfeature") {
    await db.update(tools).set({ featured: false, updatedAt: now }).where(inArray(tools.id, ids));
  } else if (action === "verify") {
    await db
      .update(tools)
      .set({ verified: true, lastVerifiedAt: now, updatedAt: now })
      .where(inArray(tools.id, ids));
  } else if (action === "unverify") {
    await db.update(tools).set({ verified: false, updatedAt: now }).where(inArray(tools.id, ids));
  } else if (action === "flag_incomplete") {
    // Completeness workflow: incomplete tools are queued for review and lose
    // their verified badge until the missing docs/GitHub/install links land.
    await db
      .update(tools)
      .set({ status: "needs_review", verified: false, updatedAt: now })
      .where(inArray(tools.id, ids));
  }

  await logAudit("tools.bulk", `tools:${ids.length}`, `${action}: ${ids.join(",")}`);
  await touch();
  redirect("/admin/tools?bulk=1");
}

// ── Submissions ─────────────────────────────────────────────────────────

type ApproveOutcome = "ok" | "missing" | "category" | "url" | "duplicate" | "save";

async function approveSubmissionById(id: number): Promise<ApproveOutcome> {
  const sub = await db.select().from(submissions).where(eq(submissions.id, id)).get();
  if (!sub || sub.status !== "pending") return "missing";

  // The submission's category must resolve to a real category — approving
  // without one would silently drop the tool from the directory, so leave
  // the submission pending and surface the problem instead.
  const cat = getCatalog().categories.find((c) => c.slug === sub.categorySlug);
  if (!cat) return "category";

  const now = Date.now();

  // Defense in depth: the submit form validates, but anything can end up in
  // the table. Never render a non-http(s) href, never approve a URL that is
  // already listed.
  const url = safeHttpUrl(sub.url);
  if (!url) return "url";
  if (await findDuplicateUrl(url)) return "duplicate";

  try {
    await db.insert(tools).values({
      name: sub.name,
      slug: await generateUniqueSlugIncludingTrash(slugify(sub.name)),
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
    return "save";
  }

  await db
    .update(submissions)
    .set({ status: "approved", reviewedAt: now, rejectionReason: null })
    .where(eq(submissions.id, id));
  return "ok";
}

export async function approveSubmissionAction(formData: FormData) {
  await requireCap("moderate");
  const id = Number(formData.get("id") ?? 0);
  const outcome = await approveSubmissionById(id);
  if (outcome === "ok") {
    await logAudit("submission.approve", `submission:${id}`, "Approved and published as a tool");
    await touch();
    redirect("/admin/submissions?approved=1");
  }
  if (outcome === "missing") redirect("/admin/submissions");
  redirect(`/admin/submissions?error=${outcome}`);
}

export async function bulkApproveSubmissionsAction(formData: FormData) {
  await requireCap("moderate");
  const ids = formData
    .getAll("ids")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) redirect("/admin/submissions?error=none");

  let approved = 0;
  let failed = 0;
  for (const id of ids) {
    const outcome = await approveSubmissionById(id);
    if (outcome === "ok") approved += 1;
    else failed += 1;
  }
  if (approved > 0) await touch();
  await logAudit("submissions.bulk_approve", `submissions:${ids.length}`, `approved=${approved} failed=${failed}`);
  redirect(`/admin/submissions?bulk=approved-${approved}-failed-${failed}`);
}

export async function updateSubmissionAndApproveAction(formData: FormData) {
  await requireCap("moderate");
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const url = safeHttpUrl(String(formData.get("url") ?? "")) ?? "";
  const description = String(formData.get("description") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const pricing = String(formData.get("pricing") ?? "free");
  const tags = JSON.stringify(commaList(formData.get("tags")));

  if (!id || !name || !url || !description || !categorySlug) {
    redirect(`/admin/submissions/${id}?error=validation`);
  }

  await db
    .update(submissions)
    .set({
      name,
      url,
      description,
      categorySlug,
      pricing,
      tags,
      githubUrl: optUrl(formData.get("githubUrl")),
      documentationUrl: optUrl(formData.get("documentationUrl")),
    })
    .where(and(eq(submissions.id, id), eq(submissions.status, "pending")));

  const outcome = await approveSubmissionById(id);
  if (outcome === "ok") {
    await logAudit("submission.edit_approve", `submission:${id}`, `Edited then approved: ${name}`);
    await touch();
    redirect("/admin/submissions?approved=1");
  }
  if (outcome === "missing") redirect("/admin/submissions");
  redirect(`/admin/submissions/${id}?error=${outcome}`);
}

export async function rejectSubmissionAction(formData: FormData) {
  await requireCap("moderate");
  const id = Number(formData.get("id") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  // Only pending submissions are actionable — re-rejecting an
  // already-reviewed row would overwrite the original decision's timestamp.
  await db
    .update(submissions)
    .set({ status: "rejected", reviewedAt: Date.now(), rejectionReason: reason || null })
    .where(and(eq(submissions.id, id), eq(submissions.status, "pending")));
  await logAudit("submission.reject", `submission:${id}`, reason ? `Rejected: ${reason}` : "Rejected");
  redirect("/admin/submissions?rejected=1");
}

// Lightweight AI/heuristic metadata suggestion for the submission editor.
// Never writes anything: returns category and tag candidates for a human to
// accept. Uses the optional LLM endpoint when configured, otherwise a local
// keyword matcher over the live catalog.
export interface MetaSuggestion {
  categories: { slug: string; name: string; why: string }[];
  tags: string[];
  source: "llm" | "heuristic";
  note?: string;
}

export async function suggestSubmissionMetaAction(
  name: string,
  description: string,
): Promise<MetaSuggestion> {
  await requireCap("moderate");
  const catalog = getCatalog();
  const text = `${name} ${description}`.toLowerCase();

  const heuristic: MetaSuggestion = {
    categories: catalog.categories
      .filter((c) => {
        const n = c.name.toLowerCase();
        const s = c.slug.replace(/-/g, " ");
        return text.includes(n) || text.includes(s);
      })
      .slice(0, 3)
      .map((c) => ({ slug: c.slug, name: c.name, why: "Nama/kategori disebut di deskripsi" })),
    tags: [...new Set(catalog.tools.flatMap((t) => t.tags))]
      .filter((tag) => tag.length > 2 && text.includes(tag.toLowerCase()))
      .slice(0, 8),
    source: "heuristic",
  };

  const apiKey = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return heuristic;

  const base = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const cats = catalog.categories.map((c) => `${c.slug} (${c.name})`).join(", ");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "You classify developer tools. Reply with STRICT JSON only: {\"categories\":[\"slug\"],\"tags\":[\"tag\"]}. Use only slugs from the provided category list; tags are short lowercase words. Never invent categories.",
          },
          {
            role: "user",
            content: `Tool: ${name}\nDescription: ${description}\nCategories: ${cats}`,
          },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return heuristic;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return heuristic;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      categories?: unknown;
      tags?: unknown;
    };
    const validSlugs = new Set(catalog.categories.map((c) => c.slug));
    const llmCats = Array.isArray(parsed.categories)
      ? parsed.categories
          .filter((s): s is string => typeof s === "string" && validSlugs.has(s))
          .slice(0, 3)
          .map((slug) => ({
            slug,
            name: catalog.categories.find((c) => c.slug === slug)?.name ?? slug,
            why: "Saran LLM",
          }))
      : [];
    const llmTags = Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.toLowerCase().trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
    if (llmCats.length === 0 && llmTags.length === 0) return heuristic;
    return { categories: llmCats, tags: llmTags, source: "llm" };
  } catch {
    return heuristic;
  }
}

// ── Community feedback ──────────────────────────────────────────────────

export async function resolveFeedbackAction(formData: FormData) {
  await requireCap("moderate");
  const id = Number(formData.get("id") ?? 0);
  await db
    .update(feedback)
    .set({ status: "resolved", resolvedAt: Date.now() })
    .where(eq(feedback.id, id));
  await logAudit("feedback.resolve", `feedback:${id}`, "Marked resolved");
  revalidatePath("/admin");
  revalidatePath("/admin/feedback");
}

export async function dismissFeedbackAction(formData: FormData) {
  await requireCap("moderate");
  const id = Number(formData.get("id") ?? 0);
  await db
    .update(feedback)
    .set({ status: "dismissed", resolvedAt: Date.now() })
    .where(eq(feedback.id, id));
  await logAudit("feedback.dismiss", `feedback:${id}`, "Dismissed");
  revalidatePath("/admin");
  revalidatePath("/admin/feedback");
}

// ── Billing ─────────────────────────────────────────────────────────────

export async function reconcileOrdersAction() {
  await requireCap("billing");
  const { reconcilePendingOrders } = await import("@/lib/reconcile");
  const res = await reconcilePendingOrders(50);
  await logAudit("orders.reconcile", "orders", `checked=${res.checked} paid=${res.paid} expired=${res.expired}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect(`/admin?reconciled=${res.paid}&checked=${res.checked}`);
}

export async function grantProAction(formData: FormData) {
  await requireCap("billing");
  const { normalizeEmail } = await import("@/lib/auth");
  const { users } = await import("@/db/schema");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) redirect("/admin?grant_error=invalid_email");

  const now = Date.now();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: number;
  if (existing[0]) {
    userId = existing[0].id;
  } else {
    const inserted = await db.insert(users).values({ email, createdAt: now }).returning({ id: users.id });
    userId = inserted[0].id;
  }

  await db.insert(entitlements).values({
    userId,
    productId: "pro_all",
    createdAt: now,
  });
  await logAudit("entitlement.grant", `user:${email}`, "Granted Pro Lifetime (pro_all)");
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect(`/admin?granted=${encodeURIComponent(email)}`);
}

// ── Coupons ─────────────────────────────────────────────────────────────

export async function createCouponAction(formData: FormData) {
  await requireCap("billing");
  const { normalizeCouponCode } = await import("@/lib/coupons");

  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const discountType = String(formData.get("discountType") ?? "percent") === "fixed" ? "fixed" : "percent";
  const discountValue = Number(formData.get("discountValue") ?? 0);
  const minAmountIdr = Math.max(0, Number(formData.get("minAmountIdr") ?? 0) || 0);
  const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
  const maxUses = maxUsesRaw ? Math.max(1, Number(maxUsesRaw) || 1) : null;
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  const expiresAt = expiresRaw ? Date.parse(expiresRaw) : null;

  if (
    code.length < 3 ||
    !Number.isFinite(discountValue) ||
    discountValue <= 0 ||
    (discountType === "percent" && discountValue > 95)
  ) {
    redirect("/admin?coupon_error=invalid");
  }

  try {
    await db.insert(coupons).values({
      code,
      discountType,
      discountValue: Math.round(discountValue),
      minAmountIdr: Math.round(minAmountIdr),
      maxUses,
      usedCount: 0,
      expiresAt: expiresAt && Number.isFinite(expiresAt) ? expiresAt : null,
      active: true,
      createdAt: Date.now(),
    });
  } catch {
    redirect("/admin?coupon_error=duplicate");
  }

  await logAudit("coupon.create", `coupon:${code}`, `${discountType} ${discountValue}`);
  revalidatePath("/admin");
  redirect(`/admin?coupon_created=${encodeURIComponent(code)}`);
}

export async function updateCouponAction(formData: FormData) {
  await requireCap("billing");
  const id = Number(formData.get("id") ?? 0);
  const discountType = String(formData.get("discountType") ?? "percent") === "fixed" ? "fixed" : "percent";
  const discountValue = Number(formData.get("discountValue") ?? 0);
  const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
  const maxUses = maxUsesRaw ? Math.max(1, Number(maxUsesRaw) || 1) : null;
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  const expiresAt = expiresRaw ? Date.parse(expiresRaw) : null;
  if (!id || discountValue <= 0 || (discountType === "percent" && discountValue > 95)) {
    redirect("/admin?coupon_error=invalid");
  }
  await db
    .update(coupons)
    .set({
      discountType,
      discountValue: Math.round(discountValue),
      maxUses,
      expiresAt: expiresAt && Number.isFinite(expiresAt) ? expiresAt : null,
    })
    .where(eq(coupons.id, id));
  await logAudit("coupon.update", `coupon:${id}`, `${discountType} ${discountValue}`);
  revalidatePath("/admin");
  redirect("/admin?coupon_updated=1");
}

export async function toggleCouponAction(formData: FormData) {
  await requireCap("billing");
  const id = Number(formData.get("id") ?? 0);
  const nextActive = String(formData.get("active") ?? "") === "1";
  if (id) {
    await db.update(coupons).set({ active: nextActive }).where(eq(coupons.id, id));
    await logAudit("coupon.toggle", `coupon:${id}`, nextActive ? "Activated" : "Paused");
    revalidatePath("/admin");
  }
}

export async function deleteCouponAction(formData: FormData) {
  await requireCap("billing");
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db.delete(coupons).where(eq(coupons.id, id));
    await logAudit("coupon.delete", `coupon:${id}`, "Deleted");
    revalidatePath("/admin");
  }
}
