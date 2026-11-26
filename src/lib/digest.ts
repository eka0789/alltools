import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { toolClicks } from "@/db/schema";
import { getCatalog } from "@/lib/data";
import { confirmedSubscribers, unsubscribeUrl } from "@/lib/newsletter";
import { sendEmail, siteUrl, emailShell, escapeHtml } from "@/lib/email";

// Weekly digest content + delivery, shared by the Vercel Cron route and the
// admin "Send now" button. Content is honest by construction: real weekly
// outbound clicks plus the newest catalog additions.

export interface DigestData {
  popularHtml: string;
  newHtml: string;
  popularCount: number;
  newestCount: number;
}

export async function buildDigestData(): Promise<DigestData> {
  const catalog = getCatalog();
  const nameOf = (slug: string) => catalog.bySlug.get(slug)?.name ?? slug;

  let popular: { slug: string; name: string; clicks: number }[] = [];
  try {
    const rows = await db
      .select({ slug: toolClicks.slug, weekly: toolClicks.weeklyClicks })
      .from(toolClicks)
      .orderBy(desc(toolClicks.weeklyClicks), desc(toolClicks.clicks))
      .limit(8);
    popular = rows
      .filter((r) => r.weekly > 0)
      .map((r) => ({ slug: r.slug, name: nameOf(r.slug), clicks: r.weekly }));
  } catch {
    // click table missing — digest still ships with new tools
  }

  const newest = [...catalog.tools]
    .filter((t) => t.status === "active")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  const popularHtml = popular.length
    ? `<h2 style="font-size:14px;margin:0 0 8px;">Most opened this week</h2><ol style="padding-left:20px;margin:0 0 20px;">${popular
        .map(
          (p) =>
            `<li style="margin-bottom:4px;"><a href="${siteUrl()}/tools/${encodeURIComponent(p.slug)}" style="color:#4f46e5;">${escapeHtml(p.name)}</a> — ${p.clicks} opens</li>`,
        )
        .join("")}</ol>`
    : "";

  const newHtml = `<h2 style="font-size:14px;margin:0 0 8px;">Fresh in the catalog</h2><ul style="padding-left:20px;margin:0;">${newest
    .map(
      (t) =>
        `<li style="margin-bottom:4px;"><a href="${siteUrl()}/tools/${encodeURIComponent(t.slug)}" style="color:#4f46e5;">${escapeHtml(t.name)}</a> — ${escapeHtml(t.description)}</li>`,
    )
    .join("")}</ul>`;

  return {
    popularHtml,
    newHtml,
    popularCount: popular.length,
    newestCount: newest.length,
  };
}

export function renderDigestEmail(data: DigestData, unsubUrl: string): string {
  return emailShell(
    "This week on AktifKoding",
    `${data.popularHtml}${data.newHtml}`,
    `<a href="${unsubUrl}" style="color:#71717a;text-decoration:underline;">Unsubscribe in one click</a>`,
  );
}

export const DIGEST_SUBJECT =
  "AktifKoding weekly — new tools & what developers are opening";

export interface DigestSendResult {
  recipients: number;
  sent: number;
  skipped?: string;
}

export async function sendWeeklyDigest(): Promise<DigestSendResult> {
  const recipients = await confirmedSubscribers();
  if (recipients.length === 0) {
    return { recipients: 0, sent: 0, skipped: "no confirmed subscribers" };
  }
  const data = await buildDigestData();
  let sent = 0;
  for (const email of recipients) {
    const result = await sendEmail({
      to: email,
      subject: DIGEST_SUBJECT,
      html: renderDigestEmail(data, unsubscribeUrl(email)),
    });
    if (result.ok) sent += 1;
  }
  return { recipients: recipients.length, sent };
}
