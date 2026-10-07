import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, redeemMagicToken, sessionCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Magic-link redemption: GET from the emailed link. Sets the session cookie
// and redirects to /login. Never caches — tokens are single-use.
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") ?? "").slice(0, 200);
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=verify_invalid", req.nextUrl.origin));
  }

  const sessionToken = await redeemMagicToken(token);
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login?error=verify_invalid", req.nextUrl.origin));
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return NextResponse.redirect(new URL("/login?signedin=1", req.nextUrl.origin));
}
