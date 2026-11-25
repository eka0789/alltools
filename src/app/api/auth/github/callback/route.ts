import { NextRequest, NextResponse } from "next/server";
import {
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

export async function GET(req: NextRequest) {
  const base = siteUrl();
  if (!githubOAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=github_not_configured", base));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errParam = req.nextUrl.searchParams.get("error");

  if (errParam || !code || !state) {
    return NextResponse.redirect(new URL("/login?error=github_denied", base));
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
    return NextResponse.redirect(new URL("/login?error=github_state", base));
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
    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/login?error=github_failed", base));
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?error=github_failed", base));
    }

    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "AktifKoding-OAuth",
      },
    });
    if (!emailRes.ok) {
      return NextResponse.redirect(new URL("/login?error=github_failed", base));
    }
    const emails = (await emailRes.json()) as GitHubEmail[];
    const chosen =
      emails.find((e) => e.primary && e.verified) ??
      emails.find((e) => e.verified);
    if (!chosen?.email) {
      return NextResponse.redirect(new URL("/login?error=github_no_email", base));
    }

    const sessionToken = await createSessionForEmail(chosen.email);
    const res = NextResponse.redirect(new URL(nextPath, base));
    res.cookies.delete(STATE_COOKIE);
    res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    res.cookies.set(SESSION_HINT_COOKIE, "1", sessionHintCookieOptions());
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login?error=github_failed", base));
  }
}
