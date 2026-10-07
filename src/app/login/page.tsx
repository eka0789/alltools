import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, CheckCircle2, TriangleAlert } from "lucide-react";
import { getSessionUser as getCurrentUser } from "@/lib/auth";
import { signOutAction, requestMagicLinkAction } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to AllTools to sync your shortlist across devices — passwordless, email only.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid_email: "That doesn't look like a valid email address.",
  rate_limited: "Too many sign-in attempts. Try again in a few minutes.",
  email_not_configured:
    "Email delivery isn't configured on this deployment yet — set RESEND_API_KEY to enable sign-in.",
  email_failed: "Couldn't send the email right now. Try again in a moment.",
  verify_invalid: "That sign-in link is invalid, already used, or expired. Request a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <LogIn className="h-6 w-6 text-accent" />
        {user ? "You're signed in" : "Sign in to AllTools"}
      </h1>

      {user ? (
        <div className="card mt-6 space-y-4 p-6">
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Signed in as <strong>{user.email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Your shortlist and compare list sync to this account automatically —
            open AllTools on another device, sign in, and they&apos;ll be there.
          </p>
          <div className="flex gap-2">
            <Link href="/favorites" className="btn-primary">Your shortlist</Link>
            <form action={signOutAction}>
              <button type="submit" className="btn-secondary">Sign out</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            No password, no account creation — enter your email, click the link we
            send, and your locally-saved shortlist syncs to every device you sign
            in from.
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

          <form action={requestMagicLinkAction} className="card mt-6 space-y-4 p-6">
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
              Passwordless only. We store your email and your synced shortlist —
              nothing else. No tracking, no marketing.
            </p>
          </form>
        </>
      )}
    </div>
  );
}
