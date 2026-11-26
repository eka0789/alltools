"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DB_IS_REMOTE } from "@/db/client";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { invalidateCatalog, refreshCatalogFromDb } from "@/lib/data";
import { refreshGithubStatsBatch } from "@/lib/github-stats";

async function requireSystem() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");
}

export async function refreshCatalogAction() {
  await requireSystem();
  invalidateCatalog();
  let rebuilt = false;
  try {
    if (DB_IS_REMOTE) {
      await refreshCatalogFromDb();
      rebuilt = true;
    }
  } catch {
    // The TTL refresh will pick it up; the local cache is already invalidated.
  }
  revalidatePath("/", "layout");
  await logAudit(
    "ops.refresh_catalog",
    "catalog",
    rebuilt ? "Rebuilt from database" : "Invalidated local cache",
  );
  redirect("/admin/ops?ok=catalog");
}

export async function runGithubStatsAction() {
  await requireSystem();
  let result;
  try {
    result = await refreshGithubStatsBatch(8);
  } catch {
    redirect("/admin/ops?error=github");
  }
  try {
    invalidateCatalog();
    if (DB_IS_REMOTE) await refreshCatalogFromDb();
  } catch {
    // best effort
  }
  await logAudit(
    "ops.github_stats",
    "tools",
    `checked=${result.checked} updated=${result.updated} failed=${result.failed}`,
  );
  revalidatePath("/admin/ops");
  redirect(
    `/admin/ops?github=checked-${result.checked}-updated-${result.updated}-failed-${result.failed}`,
  );
}
