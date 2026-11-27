import { createHmac, timingSafeEqual } from "crypto";
import { and, eq, inArray, isNull, lte, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  emailCampaigns,
  emailEvents,
  entitlements,
  users,
  type EmailCampaign,
} from "@/db/schema";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";
import { confirmedSubscribers, unsubscribeUrl } from "@/lib/newsletter";
import { emailShell, escapeHtml, sendEmail, siteUrl } from "@/lib/email";

// Marketing campaigns + first-party engagement tracking (open pixel, tracked
// CTA). No third-party webhook needed; tokens are HMAC-signed per recipient.

function campaignSecret(): string {
  return (
    process.env.CAMPAIGN_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.ADMIN_TOKEN?.trim() ||
    "aktifkoding-campaign-dev"
  );
}

  export function campaignToken(campaignId: number, email: string, url?: string): string {
    const payload =
      url !== undefined
        ? `campaign:${campaignId}:${email.toLowerCase()}:${url}`
        : `campaign:${campaignId}:${email.toLowerCase()}`;
    return createHmac("sha256", campaignSecret()).update(payload).digest("base64url");
  }

  export function verifyCampaignToken(
    campaignId: number,
    email: string,
    token: string,
    url?: string,
  ): boolean {
    const expected = campaignToken(campaignId, email, url);
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(token, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  export const CAMPAIGN_SEGMENTS = ["subscribers", "users", "pro"] as const;
  export type CampaignSegment = (typeof CAMPAIGN_SEGMENTS)[number];

  export async function resolveSegment(segment: string): Promise<string[]> {
    try {
      if (segment === "subscribers") return await confirmedSubscribers();
      if (segment === "users") {
        const rows = await db.select({ email: users.email }).from(users);
        return rows.map((row) => row.email);
      }
      if (segment === "pro") {
        const rows = await db
          .select({ email: users.email })
          .from(users)
          .innerJoin(entitlements, eq(entitlements.userId, users.id))
          .where(isNull(entitlements.revokedAt))
          .groupBy(users.email);
        return rows.map((row) => row.email);
      }
      return [];
    } catch {
      return [];
    }
  }

  export function renderCampaignEmail(campaign: EmailCampaign, email: string): string {
    const paragraphs = campaign.body
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("");
    const cta =
      campaign.ctaLabel && campaign.ctaUrl
        ? `<p style="margin:20px 0;"><a href="${siteUrl()}/api/campaigns/click?c=${campaign.id}&e=${encodeURIComponent(
          email,
        )}&t=${campaignToken(campaign.id, email, campaign.ctaUrl)}&u=${encodeURIComponent(
          campaign.ctaUrl,
        )}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">${escapeHtml(
          campaign.ctaLabel,
        )}</a></p>`
        : "";
    const pixel = `<img src="${siteUrl()}/api/campaigns/open?c=${campaign.id}&e=${encodeURIComponent(
      email,
    )}&t=${campaignToken(campaign.id, email)}" width="1" height="1" alt="" style="display:none;border:0;">`;
    const unsub =
      campaign.segment === "subscribers"
        ? `<a href="${unsubscribeUrl(email)}" style="color:#71717a;text-decoration:underline;">Unsubscribe</a>`
        : "";
    return emailShell("AktifKoding", `${paragraphs}${cta}${pixel}`, unsub);
  }

  export async function recordEmailEvent(
    campaignId: number,
    email: string,
    type: "open" | "click",
    url: string | null,
  ): Promise<void> {
    try {
      await ensureAdminSchema();
      await db
        .insert(emailEvents)
        .values({
          campaignId,
          email: email.toLowerCase(),
          type,
          url,
          createdAt: Date.now(),
        })
        .onConflictDoNothing();
    } catch {
      // tracking must never break the pixel/redirect
    }
  }

  export interface CampaignSendResult {
    recipients: number;
    sent: number;
    error?: string;
  }

  export async function sendCampaign(id: number): Promise<CampaignSendResult> {
    await ensureAdminSchema();
    const campaign = (
      await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1)
    )[0];
    if (!campaign) return { recipients: 0, sent: 0, error: "not-found" };
      const claimed = await db
        .update(emailCampaigns)
        .set({ status: "sending", updatedAt: Date.now() })
        .where(
          and(
            eq(emailCampaigns.id, id),
            notInArray(emailCampaigns.status, ["sending", "sent"]),
          ),
        )
        .returning({ id: emailCampaigns.id });
      if (claimed.length === 0) {
        return { recipients: 0, sent: 0, error: "already-sent" };
      }

      const recipients = [
        ...new Set((await resolveSegment(campaign.segment)).map((email) => email.toLowerCase())),
      ].slice(0, 1000);

      let sent = 0;
      for (const email of recipients) {
        const result = await sendEmail({
          to: email,
          subject: campaign.subject,
          html: renderCampaignEmail(campaign, email),
        });
        if (result.ok) sent += 1;
      }

      await db
        .update(emailCampaigns)
        .set({
          status: recipients.length > 0 && sent === 0 ? "failed" : "sent",
          sentAt: Date.now(),
          recipients: recipients.length,
          sentCount: sent,
          updatedAt: Date.now(),
        })
        .where(eq(emailCampaigns.id, id));

      return { recipients: recipients.length, sent };
    }

    export async function sendTestCampaign(id: number, email: string): Promise<boolean> {
      await ensureAdminSchema();
      const campaign = (
        await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1)
      )[0];
      if (!campaign) return false;
      const result = await sendEmail({
        to: email,
        subject: `[TEST] ${campaign.subject}`,
        html: renderCampaignEmail(campaign, email),
      });
      return result.ok;
    }

    export async function sendDueCampaigns(): Promise<{ campaigns: number; sent: number }> {
      try {
        await ensureAdminSchema();
        const due = await db
          .select({ id: emailCampaigns.id })
          .from(emailCampaigns)
          .where(
            and(
              eq(emailCampaigns.status, "scheduled"),
              lte(emailCampaigns.scheduledAt, Date.now()),
            ),
          )
          .limit(5);
        let sent = 0;
        for (const row of due) {
          const result = await sendCampaign(row.id);
          sent += result.sent;
        }
        return { campaigns: due.length, sent };
      } catch {
        return { campaigns: 0, sent: 0 };
      }
    }

    export async function campaignEngagement(
      ids: number[],
    ): Promise<Map<number, { opens: number; clicks: number }>> {
      const map = new Map<number, { opens: number; clicks: number }>();
      if (ids.length === 0) return map;
      try {
        await ensureAdminSchema();
        const rows = await db
          .select()
          .from(emailEvents)
          .where(inArray(emailEvents.campaignId, ids));
        for (const row of rows) {
          const entry = map.get(row.campaignId) ?? { opens: 0, clicks: 0 };
          if (row.type === "open") entry.opens += 1;
          else if (row.type === "click") entry.clicks += 1;
          map.set(row.campaignId, entry);
        }
      } catch {
        // ignore
      }
      return map;
    }
