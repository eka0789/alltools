"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, DB_IS_REMOTE } from "@/db/client";
import { tools } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { getCatalog, invalidateCatalog, refreshCatalogFromDb } from "@/lib/data";
import { runCheckBatch, runCheckForTool, type CheckableTool } from "@/lib/link-checker";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

async function afterCheck() {
  invalidateCatalog();
  if (DB_IS_REMOTE) await refreshCatalogFromDb();
  revalidatePath("/admin/link-health");
  revalidatePath("/admin/tools");
  revalidatePath("/");
}

export async function checkToolNowAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  const tool = getCatalog().byId.get(id);
  if (!tool) redirect("/admin/link-health?error=not_found");

  const result = await runCheckForTool({
    id: tool.id,
    slug: tool.slug,
    url: tool.url,
    status: tool.status,
  });
  await logAudit(
    "link.check",
    `tool:${tool.slug}`,
    `${result.outcome} ${result.httpStatus ?? result.error ?? ""}`.trim(),
  );
  await afterCheck();
  redirect(`/admin/link-health?checked=${result.outcome}`);
}

// Verify a small batch: flagged tools first, then the least-recently verified
// active tools. Kept small (6) so the request stays well within limits.
export async function checkBatchAction() {
  await requireCatalog();

  const picked: CheckableTool[] = [];
  try {
    const flagged = await db
      .select({ id: tools.id, slug: tools.slug, url: tools.url, status: tools.status })
      .from(tools)
      .where(and(eq(tools.status, "needs_review"), isNull(tools.deletedAt)))
      .limit(6);
    picked.push(...flagged);

    if (picked.length < 6) {
      const seen = new Set(picked.map((t) => t.id));
      const stale = await db
        .select({ id: tools.id, slug: tools.slug, url: tools.url, status: tools.status })
        .from(tools)
        .where(and(isNull(tools.deletedAt), sql`${tools.status} != 'deprecated'`))
        .orderBy(asc(tools.lastVerifiedAt))
        .limit(18);
      for (const row of stale) {
        if (picked.length >= 6) break;
        if (!seen.has(row.id)) {
          seen.add(row.id);
          picked.push(row);
        }
      }
    }
  } catch {
    redirect("/admin/link-health?error=db");
  }

  if (picked.length === 0) redirect("/admin/link-health?batch=empty");

  const results = await runCheckBatch(picked, 3);
  const ok = results.filter((r) => r.outcome === "ok").length;
  const review = results.filter((r) => r.outcome === "needs_review").length;
  const transient = results.filter((r) => r.outcome === "transient" || r.outcome === "blocked").length;

  await logAudit("link.batch", `tools:${picked.length}`, `ok=${ok} review=${review} transient=${transient}`);
  await afterCheck();
  redirect(`/admin/link-health?batch=ok-${ok}-review-${review}-transient-${transient}`);
}

export async function markToolReviewedAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    const now = Date.now();
    await db
      .update(tools)
      .set({ status: "active", verified: true, lastVerifiedAt: now, updatedAt: now })
      .where(eq(tools.id, id));
    await logAudit("link.mark_ok", `tool:${id}`, "Manually marked reviewed/active");
    await afterCheck();
  }
  redirect("/admin/link-health?row=active");
}

export async function markToolNeedsReviewAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db
      .update(tools)
      .set({ status: "needs_review", verified: false, updatedAt: Date.now() })
      .where(eq(tools.id, id));
    await logAudit("link.mark_review", `tool:${id}`, "Manually flagged for review");
    await afterCheck();
  }
  redirect("/admin/link-health?row=review");
}

export async function deprecateToolAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db
      .update(tools)
      .set({ status: "deprecated", updatedAt: Date.now() })
      .where(eq(tools.id, id));
    await logAudit("tool.deprecate", `tool:${id}`, "Deprecated from link health");
    await afterCheck();
  }
  redirect("/admin/link-health?row=deprecated");
}
