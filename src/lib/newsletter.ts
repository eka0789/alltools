import { createHash, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { subscribers } from "@/db/schema";
import { sendEmail, siteUrl, emailShell, actionButton } from "./email";

// Double-opt-in newsletter. The subscriber row stores a sha256 token used
// for both the confirmation link and the permanent unsubscribe link; until
// confirmedAt is set, the address never receives a digest.

export function normalizeSubscriberEmail(email: string): string | null {
  const cleaned = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned) ? cleaned : null;
}

export type SubscribeResult = "ok" | "already" | "email-failed";

export async function subscribe(rawEmail: string): Promise<SubscribeResult> {
  const email = normalizeSubscriberEmail(rawEmail);
  if (!email) return "ok"; // the form validates too — silently ignore junk

  const now = Date.now();
  const existing = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  if (existing[0]) {
    if (existing[0].confirmedAt && !existing[0].unsubscribedAt) return "already";
    // re-send confirmation for pending/unsubscribed addresses (resets opt-out)
    const fresh = randomBytes(32).toString("base64url");
    await db
      .update(subscribers)
      .set({ tokenHash: createHash("sha256").update(fresh).digest("hex"), unsubscribedAt: null })
      .where(eq(subscribers.id, existing[0].id));
    const sent = await sendConfirmation(email, fresh);
    return sent ? "ok" : "email-failed";
  }

  const raw = randomBytes(32).toString("base64url");
  await db.insert(subscribers).values({
    email,
    tokenHash: createHash("sha256").update(raw).digest("hex"),
    createdAt: now,
  });
  const sent = await sendConfirmation(email, raw);
  return sent ? "ok" : "email-failed";
}

async function sendConfirmation(email: string, rawToken: string): Promise<boolean> {
  const url = `${siteUrl()}/api/newsletter/confirm?token=${encodeURIComponent(rawToken)}`;
  const result = await sendEmail({
    to: email,
    subject: "Confirm your AllTools weekly digest",
    html: emailShell(
      "One click to confirm",
      `<p>You asked for the AllTools weekly digest: the newest curated tools and what the community is opening, once a week. No noise.</p>
       <p style="margin:20px 0;">${actionButton(url, "Confirm subscription")}</p>
       <p style="color:#71717a;font-size:12px;">Every issue has a one-click unsubscribe.</p>`,
    ),
  });
  return result.ok;
}

export async function confirmedSubscribers(): Promise<string[]> {
  const rows = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(and(isNull(subscribers.unsubscribedAt)));
  return rows.map((r) => r.email);
}
