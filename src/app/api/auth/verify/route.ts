import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_HINT_COOKIE,
  redeemMagicToken,
  sanitizeNextPath,
  sessionCookieOptions,
  sessionHintCookieOptions,
} from "@/lib/auth";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Magic-link redemption: GET from the emailed link. Sets the session cookie
// and redirects to the requested `next` path (or /account). Never caches.
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") ?? "").slice(0, 200);
  const next = sanitizeNextPath(req.nextUrl.searchParams.get("next"));
  // Use the canonical site URL: behind Cloudflare/Traefik the request origin
  // can be the container's internal bind address (https://0.0.0.0:3000).
  const base = siteUrl();
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=verify_invalid", base));
  }

  const sessionToken = await redeemMagicToken(token);
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login?error=verify_invalid", base));
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  store.set(SESSION_HINT_COOKIE, "1", sessionHintCookieOptions());
  const destination = next ?? "/account";
  return NextResponse.redirect(new URL(destination, base));
}
