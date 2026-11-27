"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminIdentity, logAudit, revokeAdminSession, roleCan } from "@/lib/admin";

async function requireSystem() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");
  return identity;
}

export async function revokeSessionAction(formData: FormData) {
  const identity = await requireSystem();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await revokeAdminSession(id);
    await logAudit("admin.session_revoke", `session:${id}`, `Revoked by ${identity.name}`);
    revalidatePath("/admin/sessions");
  }
  redirect("/admin/sessions?ok=revoked");
}
