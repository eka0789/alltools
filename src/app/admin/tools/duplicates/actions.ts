"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, DB_IS_REMOTE } from "@/db/client";
import { linkChecks, toolClicks, tools } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { getCatalog, invalidateCatalog, refreshCatalogFromDb } from "@/lib/data";
import { recordRedirect } from "@/lib/redirects";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

// Merge the duplicate into the survivor: clicks are summed, link-check history
// moves over, a permanent redirect is recorded and the duplicate is trashed
// (recoverable). Entitlements/orders are untouched.
export async function mergeToolsAction(formData: FormData) {
  await requireCatalog();
  const keepId = Number(formData.get("keepId") ?? 0);
  const mergeId = Number(formData.get("mergeId") ?? 0);
  if (!keepId || !mergeId || keepId === mergeId) {
    redirect("/admin/tools/duplicates?error=invalid");
  }

  const catalog = getCatalog();
  const keep = catalog.byId.get(keepId);
  const duplicate = catalog.byId.get(mergeId);
  if (!keep || !duplicate) redirect("/admin/tools/duplicates?error=missing");

  const now = Date.now();

  try {
    const rows = await db
      .select()
      .from(toolClicks)
      .where(eq(toolClicks.slug, duplicate.slug))
      .limit(1);
    const clicksRow = rows[0];
    if (clicksRow) {
      await db
        .insert(toolClicks)
        .values({
          slug: keep.slug,
          clicks: clicksRow.clicks,
          weeklyClicks: clicksRow.weeklyClicks,
          weekStart: clicksRow.weekStart,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: toolClicks.slug,
          set: {
            clicks: sql`${toolClicks.clicks} + ${clicksRow.clicks}`,
            weeklyClicks: sql`${toolClicks.weeklyClicks} + ${clicksRow.weeklyClicks}`,
            updatedAt: now,
          },
        });
      await db.delete(toolClicks).where(eq(toolClicks.slug, duplicate.slug));
    }
  } catch {
    // popularity merge is best-effort
  }

  try {
    await db.update(linkChecks).set({ toolId: keepId }).where(eq(linkChecks.toolId, mergeId));
  } catch {
    // history move is best-effort
  }

  await recordRedirect(`/tools/${duplicate.slug}`, `/tools/${keep.slug}`);
  await db
    .update(tools)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(tools.id, mergeId));

  await logAudit(
    "tool.merge",
    `tool:${duplicate.slug}`,
    `Merged into ${keep.slug} (${keep.name})`,
  );
  invalidateCatalog();
  if (DB_IS_REMOTE) {
    try {
      await refreshCatalogFromDb();
    } catch {
      // TTL refresh will catch up
    }
  }
  revalidatePath("/admin/tools/duplicates");
  revalidatePath("/admin/tools");
  redirect("/admin/tools/duplicates?merged=1");
}
