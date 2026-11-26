"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscribers } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { subscribe } from "@/lib/newsletter";
import { sendWeeklyDigest } from "@/lib/digest";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

export async function resendConfirmationAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  const rows = await db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
  const sub = rows[0];
  if (!sub) redirect("/admin/newsletter?error=not_found");

  // subscribe() re-sends the double-opt-in confirmation for pending or
  // unsubscribed addresses (and is a no-op for already-confirmed ones).
  const result = await subscribe(sub.email);
  await logAudit("newsletter.resend", `subscriber:${sub.email}`, result);
  revalidatePath("/admin/newsletter");
  redirect(`/admin/newsletter?ok=resent-${result}`);
}

export async function unsubscribeSubscriberAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db.update(subscribers).set({ unsubscribedAt: Date.now() }).where(eq(subscribers.id, id));
    await logAudit("newsletter.unsubscribe", `subscriber:${id}`, "Marked unsubscribed by admin");
    revalidatePath("/admin/newsletter");
  }
  redirect("/admin/newsletter?ok=unsubscribed");
}

export async function deleteSubscriberAction(formData: FormData) {
  await requireCatalog();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db.delete(subscribers).where(eq(subscribers.id, id));
    await logAudit("newsletter.delete", `subscriber:${id}`, "Deleted subscriber");
    revalidatePath("/admin/newsletter");
  }
  redirect("/admin/newsletter?ok=deleted");
}

export async function sendDigestNowAction() {
  await requireCatalog();
  let result;
  try {
    result = await sendWeeklyDigest();
  } catch {
    redirect("/admin/newsletter?error=digest_failed");
  }
  await logAudit(
    "newsletter.send_digest",
    "digest",
    `sent=${result.sent} recipients=${result.recipients}`,
  );
  revalidatePath("/admin/newsletter");
  redirect(`/admin/newsletter?digest=sent-${result.sent}-of-${result.recipients}`);
}
