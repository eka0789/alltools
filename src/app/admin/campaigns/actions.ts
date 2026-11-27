"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { emailCampaigns } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { normalizeEmail } from "@/lib/auth";
import { CAMPAIGN_SEGMENTS, sendCampaign, sendTestCampaign } from "@/lib/campaigns";
import { finishJobRun, startJobRun } from "@/lib/job-runs";
import { safeHttpUrl } from "@/lib/url-check";

async function requireMarketing() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

export async function createCampaignAction(formData: FormData) {
  await requireMarketing();
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 160);
  const body = String(formData.get("body") ?? "").trim().slice(0, 8000);
  const segmentRaw = String(formData.get("segment") ?? "subscribers");
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim().slice(0, 60) || null;
  const ctaUrl = safeHttpUrl(String(formData.get("ctaUrl") ?? ""));
  const scheduledRaw = String(formData.get("scheduledAt") ?? "").trim();
  const scheduledParsed = scheduledRaw ? Date.parse(scheduledRaw) : NaN;
  const scheduledAt = Number.isFinite(scheduledParsed) ? scheduledParsed : null;

  if (!subject || !body) redirect("/admin/campaigns?error=validation");
  const segment = (CAMPAIGN_SEGMENTS as readonly string[]).includes(segmentRaw)
    ? segmentRaw
    : "subscribers";

  const now = Date.now();
  await db.insert(emailCampaigns).values({
    subject,
    body,
    segment,
    ctaLabel,
    ctaUrl,
    status: scheduledAt ? "scheduled" : "draft",
    scheduledAt,
    createdAt: now,
    updatedAt: now,
  });
  await logAudit("campaign.create", `campaign:${subject}`, `segment=${segment} scheduled=${Boolean(scheduledAt)}`);
  revalidatePath("/admin/campaigns");
  redirect("/admin/campaigns?ok=created");
}

export async function sendCampaignAction(formData: FormData) {
  await requireMarketing();
  const id = Number(formData.get("id") ?? 0);
  if (!id) redirect("/admin/campaigns?error=not_found");

  const runId = await startJobRun("email-campaign");
  let recipients = 0;
  let sent = 0;
  let error: string | undefined;
  try {
    const result = await sendCampaign(id);
    recipients = result.recipients;
    sent = result.sent;
    error = result.error;
  } catch (err) {
    await finishJobRun(runId, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  await finishJobRun(runId, {
    status: error ? "failed" : "success",
    summary: `recipients=${recipients} sent=${sent}${error ? ` error=${error}` : ""}`,
    error,
  });
  await logAudit("campaign.send", `campaign:${id}`, `recipients=${recipients} sent=${sent}`);
  revalidatePath("/admin/campaigns");
  redirect(`/admin/campaigns?ok=sent-${sent}-of-${recipients}`);
}

export async function testCampaignAction(formData: FormData) {
  await requireMarketing();
  const id = Number(formData.get("id") ?? 0);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!id || !email) redirect("/admin/campaigns?error=test_email");
  const ok = await sendTestCampaign(id, email);
  await logAudit("campaign.test", `campaign:${id}`, `${ok ? "sent" : "failed"} → ${email}`);
  redirect(`/admin/campaigns?ok=${ok ? "test" : "test_failed"}`);
}

export async function cancelCampaignAction(formData: FormData) {
  await requireMarketing();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db
      .update(emailCampaigns)
      .set({ status: "draft", scheduledAt: null, updatedAt: Date.now() })
      .where(eq(emailCampaigns.id, id));
    await logAudit("campaign.cancel", `campaign:${id}`, "Schedule cancelled");
    revalidatePath("/admin/campaigns");
  }
  redirect("/admin/campaigns?ok=cancelled");
}

export async function deleteCampaignAction(formData: FormData) {
  await requireMarketing();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
    await logAudit("campaign.delete", `campaign:${id}`, "Deleted campaign");
    revalidatePath("/admin/campaigns");
  }
  redirect("/admin/campaigns?ok=deleted");
}
