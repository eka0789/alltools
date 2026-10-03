import { cookies, headers } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { rateLimit } from "./rate-limit";

export const ADMIN_COOKIE = "at_admin";

// Fail closed: without ADMIN_TOKEN there is deliberately no way to log in.
// The previous hardcoded default ("alltools-admin", printed in the README)
// left any deployment that forgot the env var wide open.
export function adminToken(): string | null {
  const token = process.env.ADMIN_TOKEN?.trim();
  return token ? token : null;
}

// The cookie stores a hash of the token, never the token itself — a stolen
// cookie cannot be replayed as the ADMIN_TOKEN env value elsewhere.
function tokenDigest(token: string): string {
  return createHash("sha256").update(`alltools:${token}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function isAdmin(): Promise<boolean> {
  const token = adminToken();
  if (!token) return false;
  const store = await cookies();
  const provided = store.get(ADMIN_COOKIE)?.value;
  if (!provided) return false;
  return safeEqual(provided, tokenDigest(token));
}

// Brute-force guard on the login form (per IP, per instance — enough to
// make guessing infeasible for an opportunistic attacker).
export async function checkLoginRateLimit(): Promise<boolean> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  return rateLimit(`login:${ip}`, 5, 10 * 60 * 1000).ok;
}
