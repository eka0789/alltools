import { NextRequest, NextResponse } from "next/server";
import {
  cookieDomain,
  createSessionForEmail,
  githubOAuthConfigured,
  sanitizeNextPath,
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
  sessionCookieOptions,
  sessionHintCookieOptions,
} from "@/lib/auth";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";

const STATE_COOKIE = "at_gh_oauth";

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

function fail(base: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, base));
}

export async function GET(req: NextRequest) {
  const base = siteUrl();
  if (!githubOAuthConfigured()) {
    return fail(base, "github_not_configured");
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errParam = req.nextUrl.searchParams.get("error");

  if (errParam || !code || !state) {
    return fail(base, "github_denied");
  }

  const rawCookie = req.cookies.get(STATE_COOKIE)?.value;
  let expectedState = "";
  let nextPath = "/account";
  try {
    const parsed = rawCookie ? (JSON.parse(rawCookie) as { state?: string; next?: string }) : {};
    expectedState = parsed.state ?? "";
    nextPath = sanitizeNextPath(parsed.next) ?? "/account";
  } catch {
    expectedState = "";
  }

  if (!expectedState || expectedState !== state) {
    console.warn("[github-oauth] state mismatch", { hasStateCookie: Boolean(rawCookie) });
    return fail(base, "github_state");
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID!.trim(),
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET!.trim(),
        code,
        redirect_uri: `${base}/api/auth/github/callback`,
      }),
    });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error(
        "[github-oauth] token exchange failed",
        tokenRes.status,
        tokenJson.error ?? "",
        tokenJson.error_description ?? "",
      );
      return fail(base, "github_failed");
    }
    const accessToken = tokenJson.access_token;

    const ghHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "AktifKoding-OAuth",
    };

    let email: string | null = null;

    const emailRes = await fetch("https://api.github.com/user/emails", { headers: ghHeaders });
    if (emailRes.ok) {
      const emails = (await emailRes.json()) as GitHubEmail[];
      email =
        emails.find((e) => e.primary && e.verified)?.email ??
        emails.find((e) => e.verified)?.email ??
        null;
    } else {
      const body = await emailRes.text().catch(() => "");
      console.error("[github-oauth] /user/emails failed", emailRes.status, body.slice(0, 300));
    }

    if (!email) {
      // GitHub Apps may not have the "Email addresses" permission; /user still
      // exposes the user's public email when they have one.
      const userRes = await fetch("https://api.github.com/user", { headers: ghHeaders });
      if (userRes.ok) {
        const profile = (await userRes.json()) as { email?: string | null };
        email = profile.email ?? null;
      } else {
        const body = await userRes.text().catch(() => "");
        console.error("[github-oauth] /user failed", userRes.status, body.slice(0, 300));
      }
    }

    if (!email) {
      console.warn(
        "[github-oauth] no usable email returned; enable the GitHub App 'Email addresses' permission",
      );
      return fail(base, "github_email_scope");
    }

    const sessionToken = await createSessionForEmail(email);
    const domain = cookieDomain();
    const res = NextResponse.redirect(new URL(nextPath, base));
    res.cookies.delete(STATE_COOKIE);
    if (domain) {
      // Clear the domain-scoped state cookie as well.
      res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0, domain });
    }
    res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    res.cookies.set(SESSION_HINT_COOKIE, "1", sessionHintCookieOptions());
    return res;
  } catch (err) {
    console.error("[github-oauth] unexpected failure", err);
    return fail(base, "github_failed");
  }
}
