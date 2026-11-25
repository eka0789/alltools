import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, CheckCircle2, TriangleAlert } from "lucide-react";
import {
  getSessionUser as getCurrentUser,
  githubOAuthConfigured,
  sanitizeNextPath,
} from "@/lib/auth";
import { signOutAction, requestMagicLinkAction } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to AktifKoding to sync your shortlist and manage Pro access — passwordless, email or GitHub.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid_email: "That doesn't look like a valid email address.",
  rate_limited: "Too many sign-in attempts. Try again in a few minutes.",
  email_not_configured:
    "Email delivery isn't configured on this deployment yet — set RESEND_API_KEY to enable sign-in.",
  email_failed:
    "Failed to send sign-in email. Please verify your Resend domain configuration and try again shortly.",
  verify_invalid: "That sign-in link is invalid, already used, or expired. Request a new one.",
  github_not_configured: "GitHub sign-in isn't configured on this deployment.",
  github_denied: "GitHub sign-in was cancelled.",
  github_state: "GitHub sign-in session expired. Please try again.",
  github_no_email: "Your GitHub account needs a verified email address to sign in.",
  github_failed: "Failed to complete GitHub sign-in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const next = sanitizeNextPath(one("next"));

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <LogIn className="h-6 w-6 text-accent" />
        {user ? "You're signed in" : "Sign in to AktifKoding"}
      </h1>

      {user ? (
        <div className="card mt-6 space-y-4 p-6">
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Signed in as <strong>{user.email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Your shortlist, compare list, Pro templates, and team seats sync
            automatically to this account.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={next ?? "/account"} className="btn-primary">
              {next ? "Continue" : "My Account & Pro"}
            </Link>
            <Link href="/favorites" className="btn-secondary">Your shortlist</Link>
            <form action={signOutAction}>
              <button type="submit" className="btn-secondary">Sign out</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            No password, no account creation — enter your email, click the link we
            send, and your shortlist &amp; Pro access sync across every device.
          </p>

          {one("sent") && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Link sent — check your inbox (and spam folder). It expires in 15 minutes.
            </p>
          )}
          {one("dev_link") && (
            <div className="mt-4 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs">
              <p className="font-medium text-accent">Dev mode (no RESEND_API_KEY):</p>
              <Link href={one("dev_link") as string} className="break-all text-accent underline">
                open the sign-in link
              </Link>
            </div>
          )}
          {one("signedin") && (
            <p className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Signed in — your shortlist is syncing to this account.
            </p>
          )}
          {one("signedout") && (
            <p className="mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              Signed out. Local shortlist stays on this device.
            </p>
          )}
          {one("error") && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {ERRORS[one("error") as string] ?? "Something went wrong."}
            </p>
          )}

          {githubOAuthConfigured() && (
            <div className="mt-6">
              <a
                href={`/api/auth/github${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                  <path d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                Lanjut dengan GitHub
              </a>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>atau pakai email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form action={requestMagicLinkAction} className={`card space-y-4 p-6 ${githubOAuthConfigured() ? "" : "mt-6"}`}>
            {next && <input type="hidden" name="next" value={next} />}
            <div>
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="input mt-1.5"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Email me a sign-in link
            </button>
            <p className="text-xs text-muted-foreground">
              Passwordless only. We store your email, synced shortlist, and any Pro
              purchases — no passwords, no spam.
            </p>
          </form>
        </>
      )}
    </div>
  );
}
