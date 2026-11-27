"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import { db, DB_IS_REMOTE } from "@/db/client";
import { tools } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { finishJobRun, startJobRun } from "@/lib/job-runs";
import { runCheckBatch } from "@/lib/link-checker";
import { reconcilePendingOrders } from "@/lib/reconcile";
import { sendWeeklyDigest } from "@/lib/digest";
import { invalidateCatalog, refreshCatalogFromDb } from "@/lib/data";

async function requireSystem() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");
}

async function afterRun() {
  invalidateCatalog();
  if (DB_IS_REMOTE) {
    try {
      await refreshCatalogFromDb();
    } catch {
      // TTL refresh will catch up
    }
  }
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/ops");
  revalidatePath("/admin/link-health");
}

export async function triggerCheckLinksAction() {
  await requireSystem();
  const runId = await startJobRun("check-links");

  let checked = 0;
  let ok = 0;
  let review = 0;
  let transient = 0;
  try {
    const now = Date.now();
    const targets = await db
      .select({ id: tools.id, slug: tools.slug, url: tools.url, status: tools.status })
      .from(tools)
      .where(
        and(
          eq(tools.status, "active"),
          isNull(tools.deletedAt),
          isNull(tools.linkIgnoredAt),
          or(isNull(tools.recheckAfter), lt(tools.recheckAfter, now)),
        ),
      )
      .orderBy(asc(tools.lastVerifiedAt))
      .limit(6);

    const results = await runCheckBatch(targets, 3);
    checked = targets.length;
    ok = results.filter((r) => r.outcome === "ok").length;
    review = results.filter((r) => r.outcome === "needs_review").length;
    transient = results.length - ok - review;
  } catch (error) {
    await finishJobRun(runId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  await finishJobRun(runId, {
    status: "success",
    summary: `checked=${checked} ok=${ok} review=${review} transient=${transient}`,
  });
  await logAudit("job.run", "check-links", `ok=${ok} review=${review}`);
  await afterRun();
  redirect(`/admin/jobs?result=check-links-ok-${ok}-review-${review}`);
}

export async function triggerReconcileAction() {
  await requireSystem();
  const runId = await startJobRun("reconcile-orders");

  let summary = "";
  try {
    const result = await reconcilePendingOrders(25);
    summary = `checked=${result.checked} paid=${result.paid} expired=${result.expired} pending=${result.stillPending}${
      result.skipped ? ` skipped=${result.skipped}` : ""
    }`;
  } catch (error) {
    await finishJobRun(runId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  await finishJobRun(runId, { status: "success", summary });
  await logAudit("job.run", "reconcile-orders", summary);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/ops");
  redirect("/admin/jobs?result=reconcile");
}

export async function triggerDigestAction() {
  await requireSystem();
  const runId = await startJobRun("weekly-digest");

  let summary = "";
  let skipped = false;
  try {
    const result = await sendWeeklyDigest();
    skipped = Boolean(result.skipped);
    summary = `recipients=${result.recipients} sent=${result.sent}${
      result.skipped ? ` skipped=${result.skipped}` : ""
    }`;
  } catch (error) {
    await finishJobRun(runId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  await finishJobRun(runId, { status: skipped ? "skipped" : "success", summary });
  await logAudit("job.run", "weekly-digest", summary);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/ops");
  redirect("/admin/jobs?result=digest");
}
