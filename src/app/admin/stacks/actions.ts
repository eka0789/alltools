"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sharedStacks } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";

async function requireModerate() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "moderate")) redirect("/admin?error=forbidden");
}

export async function deleteSharedStackAction(formData: FormData) {
  await requireModerate();
  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    await db.delete(sharedStacks).where(eq(sharedStacks.id, id));
    await logAudit("stack.delete", `stack:${id}`, "Deleted shared stack (moderation)");
    revalidatePath("/admin/stacks");
  }
  redirect("/admin/stacks?ok=deleted");
}
