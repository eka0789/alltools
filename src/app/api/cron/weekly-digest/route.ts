import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { toolClicks } from "@/db/schema";
import { getCatalog } from "@/lib/data";
import { confirmedSubscribers, unsubscribeUrl } from "@/lib/newsletter";
import { sendEmail, siteUrl, emailShell, escapeHtml } from "@/lib/email";
import { safeEqual } from "@/lib/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Weekly digest cron (Vercel Cron, Mondays 09:00 UTC — see vercel.json).
// Content is honest by construction: the most-opened tools of the past week
// from real outbound clicks, plus the newest catalog additions. Sent only to
// double-opt-in confirmed subscribers.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`digest:${clientIp(req)}`, 2, 60_000).ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const recipients = await confirmedSubscribers();
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no confirmed subscribers" });
  }

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
        .map((p) => `<li style="margin-bottom:4px;"><a href="${siteUrl()}/tools/${encodeURIComponent(p.slug)}" style="color:#4f46e5;">${escapeHtml(p.name)}</a> — ${p.clicks} opens</li>`)
        .join("")}</ol>`
    : "";

  const newHtml = `<h2 style="font-size:14px;margin:0 0 8px;">Fresh in the catalog</h2><ul style="padding-left:20px;margin:0;">${newest
    .map(
      (t) =>
        `<li style="margin-bottom:4px;"><a href="${siteUrl()}/tools/${encodeURIComponent(t.slug)}" style="color:#4f46e5;">${escapeHtml(t.name)}</a> — ${escapeHtml(t.description)}</li>`,
    )
    .join("")}</ul>`;

  let sent = 0;
  for (const email of recipients) {
    const unsub = unsubscribeUrl(email);
    const result = await sendEmail({
      to: email,
      subject: "AktifKoding weekly — new tools & what developers are opening",
      html: emailShell(
        "This week on AktifKoding",
        `${popularHtml}${newHtml}`,
        `<a href="${unsub}" style="color:#71717a;text-decoration:underline;">Unsubscribe in one click</a>`,
      ),
    });
    if (result.ok) sent += 1;
  }

  return NextResponse.json({ ok: true, recipients: recipients.length, sent });
}

// Vercel Cron mengirim GET — alias ke handler yang sama (sebelumnya hanya
// POST sehingga cron mingguan gagal 405 diam-diam).
export const GET = POST;
