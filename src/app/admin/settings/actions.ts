"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { SETTING_KEYS, isAiReviewEnabled, isCheckoutEnabled, setSetting } from "@/lib/settings";

async function requireSystem() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");
}

export async function updateSettingsAction(formData: FormData) {
  await requireSystem();
  const checkout = formData.get("checkoutEnabled") === "on";
  const ai = formData.get("aiReviewEnabled") === "on";

  await setSetting(SETTING_KEYS.checkoutEnabled, checkout ? "true" : "false");
  await setSetting(SETTING_KEYS.aiReviewEnabled, ai ? "true" : "false");

  await logAudit(
    "settings.update",
    "settings",
    `checkout=${checkout} ai_review=${ai}`,
  );
  revalidatePath("/admin/settings");
  redirect("/admin/settings?ok=1");
}

// Exposed for the page (kept here so the page imports a single module).
export async function readFlags() {
  return {
    checkoutEnabled: await isCheckoutEnabled(),
    aiReviewEnabled: await isAiReviewEnabled(),
  };
}
