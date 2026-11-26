import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { authTokens, sessions, users, userLists } from "@/db/schema";
import { acceptPendingInvitesForUser } from "@/lib/entitlements";

// Passwordless accounts. No password column exists anywhere: a magic link
// proves email ownership once, then an opaque session token (stored as a
// sha256 digest — mirroring the admin cookie pattern) keeps you signed in
// for 30 days.

export const SESSION_COOKIE = "at_session";
// Lightweight non-HttpOnly hint so client components (Navbar, AccountSync)
// know whether to query session endpoints without firing 401s for anon traffic.
export const SESSION_HINT_COOKIE = "at_logged_in";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAGIC_TTL_MS = 15 * 60 * 1000;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function normalizeEmail(email: string): string | null {
  const cleaned = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned) ? cleaned : null;
}

// Guards post-login redirects against open redirects: only internal app paths
// starting with a single "/" are accepted.
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }
  return trimmed.slice(0, 300);
}

// Creates a single-use magic-link token for the email and returns the raw
// token to embed in the URL (only the hash is persisted).
export async function createMagicToken(email: string): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await db.insert(authTokens).values({
    email,
    tokenHash: sha256(token),
    createdAt: now,
    expiresAt: now + MAGIC_TTL_MS,
  });
  return token;
}

export function githubOAuthConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_OAUTH_CLIENT_ID?.trim() &&
      process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim(),
  );
}

// Upserts a user by normalized email, creates a 30-day session, and accepts
// any pending team invites. Shared by magic-link login and GitHub OAuth.
export async function createSessionForEmail(rawEmail: string): Promise<string> {
  const email = normalizeEmail(rawEmail);
  if (!email) throw new Error("invalid-email");
  const now = Date.now();

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: number;
  if (existing[0]) {
    userId = existing[0].id;
  } else {
    const inserted = await db
      .insert(users)
      .values({ email, createdAt: now })
      .returning({ id: users.id });
    userId = inserted[0].id;
  }

  const sessionToken = randomToken();
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(sessionToken),
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });

  // Tim: undangan yang cocok dengan email ini otomatis diterima saat login.
  try {
    await acceptPendingInvitesForUser(email);
  } catch {
    // Jangan pernah gagalkan login karena proses invite.
  }
  return sessionToken;
}

// Redeems a magic token atomically: marks it used in a single conditional
// UPDATE so concurrent requests cannot double-redeem the same token.
export async function redeemMagicToken(rawToken: string): Promise<string | null> {
  const now = Date.now();
  const claimed = await db
    .update(authTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(authTokens.tokenHash, sha256(rawToken)),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, now),
      ),
    )
    .returning({ id: authTokens.id, email: authTokens.email });
  const token = claimed[0];
  if (!token) return null;

  return createSessionForEmail(token.email);
}

export interface SessionUser {
  id: number;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return getSessionUserByToken(raw);
}

export async function getSessionUserByToken(raw: string): Promise<SessionUser | null> {
  try {
    const now = Date.now();
    const rows = await db
      .select({ userId: sessions.userId, email: users.email })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, sha256(raw)), gt(sessions.expiresAt, now)))
      .limit(1);
    return rows[0] ? { id: rows[0].userId, email: rows[0].email } : null;
  } catch {
    return null;
  }
}

export async function destroySession(raw: string): Promise<void> {
  try {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(raw)));
  } catch {
    // best effort
  }
}

// Cookies are scoped to the canonical domain (from NEXT_PUBLIC_SITE_URL) so a
// sign-in started on www. still works when the OAuth callback returns on the
// apex domain. Skipped for localhost/IP hosts where Domain is not allowed.
export function cookieDomain(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  try {
    const host = new URL(raw).hostname;
    if (!host || host === "localhost" || host.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      return undefined;
    }
    return host;
  } catch {
    return undefined;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function sessionHintCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

// ── Per-user list sync ────────────────────────────────────────────────────
export async function getUserLists(userId: number): Promise<{ favorites: string[]; compare: string[] }> {
  const rows = await db.select().from(userLists).where(eq(userLists.userId, userId)).limit(1);
  const parse = (v: string | undefined): string[] => {
    try {
      const parsed = v ? JSON.parse(v) : [];
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
    } catch {
      return [];
    }
  };
  return { favorites: parse(rows[0]?.favorites), compare: parse(rows[0]?.compare) };
}

export async function putUserLists(
  userId: number,
  lists: { favorites: string[]; compare: string[] },
): Promise<void> {
  const now = Date.now();
  await db
    .insert(userLists)
    .values({
      userId,
      favorites: JSON.stringify(lists.favorites.slice(0, 100)),
      compare: JSON.stringify(lists.compare.slice(0, 4)),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userLists.userId,
      set: {
        favorites: JSON.stringify(lists.favorites.slice(0, 100)),
        compare: JSON.stringify(lists.compare.slice(0, 4)),
        updatedAt: now,
      },
    });
}

// Housekeeping helper for cron: purge expired tokens/sessions.
export async function purgeExpiredAuthRows(): Promise<void> {
  const now = Date.now();
  await db.delete(authTokens).where(lt(authTokens.expiresAt, now));
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
