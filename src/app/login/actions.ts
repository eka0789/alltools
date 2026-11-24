"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import {
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
  createMagicToken,
  destroySession,
  getSessionUser,
  normalizeEmail,
  sanitizeNextPath,
} from "@/lib/auth";
import { emailConfigured, sendEmail, siteUrl, emailShell, actionButton } from "@/lib/email";

export async function requestMagicLinkAction(formData: FormData) {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-vercel-forwarded-for-ip")?.split(",")[0].trim() ??
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  const next = sanitizeNextPath(String(formData.get("next") ?? ""));
  const nextSuffix = next ? `&next=${encodeURIComponent(next)}` : "";

  if (!rateLimit(`magic-link:${ip}`, 5, 10 * 60 * 1000).ok) {
    redirect(`/login?error=rate_limited${nextSuffix}`);
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) redirect(`/login?error=invalid_email${nextSuffix}`);

  const token = await createMagicToken(email);
  const verifyUrl = `${siteUrl()}/api/auth/verify?token=${encodeURIComponent(token)}${nextSuffix}`;

  if (emailConfigured()) {
    const result = await sendEmail({
      to: email,
      subject: "Sign in to AktifKoding",
      html: emailShell(
        "Your sign-in link",
        `<p>Click the button below to sign in as <strong>${email}</strong>. The link works once and expires in 15 minutes.</p>
         <p style="margin:20px 0;">${actionButton(verifyUrl, "Sign in")}</p>
         <p style="color:#71717a;font-size:12px;">Didn't request this? Ignore this email — nothing changes.</p>`,
      ),
    });
    if (!result.ok) redirect(`/login?error=email_failed${nextSuffix}`);
    redirect(`/login?sent=1${nextSuffix}`);
  }

  // No email provider configured. In development we surface the link in the
  // UI so the flow stays testable; production fails closed.
  if (process.env.NODE_ENV !== "production") {
    redirect(`/login?dev_link=${encodeURIComponent(verifyUrl)}${nextSuffix}`);
  }
  redirect(`/login?error=email_not_configured${nextSuffix}`);
}

export async function signOutAction() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) await destroySession(raw);
  store.delete(SESSION_COOKIE);
  store.delete(SESSION_HINT_COOKIE);
  redirect("/login?signedout=1");
}

export async function getCurrentUser() {
  return getSessionUser();
}
