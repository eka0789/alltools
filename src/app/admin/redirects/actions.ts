"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { deleteRedirect, recordRedirect } from "@/lib/redirects";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

export async function createRedirectAction(formData: FormData) {
  await requireCatalog();
  const from = String(formData.get("fromPath") ?? "").trim();
  const to = String(formData.get("toPath") ?? "").trim();
  if (!from.startsWith("/") || !to.startsWith("/")) {
    redirect("/admin/redirects?error=validation");
  }
  await recordRedirect(from, to);
  await logAudit("redirect.create", `redirect:${from}`, `→ ${to}`);
  revalidatePath("/admin/redirects");
  redirect("/admin/redirects?ok=created");
}

export async function deleteRedirectAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await deleteRedirect(id);
    await logAudit("redirect.delete", `redirect:${id}`, "Deleted");
    revalidatePath("/admin/redirects");
  }
  redirect("/admin/redirects?ok=deleted");
}
