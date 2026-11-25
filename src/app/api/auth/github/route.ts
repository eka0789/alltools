import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { githubOAuthConfigured, sanitizeNextPath } from "@/lib/auth";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";

const STATE_COOKIE = "at_gh_oauth";

// GET /api/auth/github?next=/account
export async function GET(req: NextRequest) {
  if (!githubOAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=github_not_configured", siteUrl()));
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID!.trim();
  const state = randomBytes(24).toString("base64url");
  const next = sanitizeNextPath(req.nextUrl.searchParams.get("next")) ?? "/account";
  const redirectUri = `${siteUrl()}/api/auth/github/callback`;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "read:user user:email");
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
