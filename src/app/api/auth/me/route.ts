import { NextRequest, NextResponse } from "next/server";
import { getSessionUserByToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Session probe for the client-side sync layer: 200 {email} when signed in,
// 401 otherwise. Reads the cookie directly so it works on every instance.
export async function GET(req: NextRequest) {
  if (!rateLimit(`auth-me:${clientIp(req)}`, 60, 60_000).ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const user = raw ? await getSessionUserByToken(raw) : null;
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json(
    { email: user.email },
    { headers: { "Cache-Control": "no-store" } },
  );
}
