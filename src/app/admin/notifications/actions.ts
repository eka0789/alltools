"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminIdentity } from "@/lib/admin";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

async function requireAdmin() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
}

export async function markReadAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) await markNotificationRead(id);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}

export async function markAllReadAction() {
  await requireAdmin();
  await markAllNotificationsRead();
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  redirect("/admin/notifications");
}
