import { cookies, headers } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";
import { adminAudit, adminSessions, type AdminSession } from "@/db/schema";
import { rateLimit } from "./rate-limit";

export const ADMIN_COOKIE = "at_admin";

// Multi-admin support. ADMIN_TOKENS accepts a comma-separated list of
// `name:role:token` (or `name:token`). Roles gate capabilities:
//   owner     — everything (billing, users, settings, audit)
//   editor    — catalog, content, moderation, analytics
//   moderator — moderation only (submissions, reports, shared stacks)
// The legacy ADMIN_TOKEN still works as a single owner named "admin".
// Tokens may contain ":" (only the first two separators are structural for
// the 3+ segment form), so SSH-style base64 tokens are safe.

export type AdminRole = "owner" | "editor" | "moderator";
export type Capability = "moderate" | "catalog" | "billing" | "system";

export interface AdminIdentity {
  name: string;
  role: AdminRole;
}

interface TokenEntry {
  name: string;
  role: AdminRole;
  token: string;
}

const ROLE_RANK: Record<AdminRole, number> = { moderator: 1, editor: 2, owner: 3 };

export function roleCan(role: AdminRole, capability: Capability): boolean {
  switch (capability) {
    case "moderate":
      return ROLE_RANK[role] >= ROLE_RANK.moderator;
    case "catalog":
      return ROLE_RANK[role] >= ROLE_RANK.editor;
    case "billing":
    case "system":
      return role === "owner";
    default:
      return false;
  }
}

export function isAdminRole(value: string): value is AdminRole {
  return value === "owner" || value === "editor" || value === "moderator";
}

function parseEntries(): TokenEntry[] {
  const entries: TokenEntry[] = [];
  const multi = process.env.ADMIN_TOKENS?.trim();
  if (multi) {
    for (const raw of multi.split(",")) {
      const part = raw.trim();
      if (!part) continue;
      const bits = part.split(":");
      if (bits.length >= 3) {
        const name = bits[0].trim();
        const roleRaw = bits[1].trim();
        const token = bits.slice(2).join(":").trim();
        if (name && token) {
          entries.push({ name, role: isAdminRole(roleRaw) ? roleRaw : "owner", token });
        }
      } else if (bits.length === 2) {
        const name = bits[0].trim();
        const token = bits.slice(1).join(":").trim();
        if (name && token) entries.push({ name, role: "owner", token });
      }
    }
  }
  const legacy = process.env.ADMIN_TOKEN?.trim();
  if (legacy) entries.push({ name: "admin", role: "owner", token: legacy });
  return entries;
}

// Fail closed: without any configured token there is deliberately no way to
// log in. The previous hardcoded default ("alltools-admin", printed in the
// README) left any deployment that forgot the env var wide open.
export function adminToken(): string | null {
  return parseEntries()[0]?.token ?? null;
}

export function adminTokenCount(): number {
  return parseEntries().length;
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
export { safeEqual };

export function matchAdminToken(provided: string): TokenEntry | null {
  if (!provided) return null;
  for (const entry of parseEntries()) {
    if (safeEqual(provided, entry.token)) return entry;
  }
  return null;
}

export async function isAdminIpAllowed(): Promise<boolean> {
  const raw = process.env.ADMIN_IP_ALLOWLIST?.trim();
  if (!raw) return true;
  const allowed = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (allowed.includes("*")) return true;
  const hdrs = await headers();
  const ip =
    hdrs.get("x-vercel-forwarded-for-ip")?.split(",")[0].trim() ??
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdrs.get("x-real-ip")?.trim() ??
    "unknown";
  return allowed.includes(ip);
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const entries = parseEntries();
  if (entries.length === 0) return null;
  const store = await cookies();
  const provided = store.get(ADMIN_COOKIE)?.value;
  if (!provided) return null;

  // Server-side sessions (revocable) take the `s.` prefix.
  if (provided.startsWith(ADMIN_SESSION_PREFIX)) {
    return identityFromSession(provided.slice(ADMIN_SESSION_PREFIX.length));
  }

  for (const entry of entries) {
    if (safeEqual(provided, tokenDigest(entry.token))) {
      if (!(await isAdminIpAllowed())) return null;
      // Every authenticated admin request bootstraps the additive admin
      // schema once per instance, so pages/actions never query a column the
      // live database does not have yet.
      try {
        await ensureAdminSchema();
      } catch {
        // A DB hiccup must not turn a valid session into a login loop.
      }
      return { name: entry.name, role: entry.role };
    }
  }
  return null;
}

// ── Revocable admin sessions ────────────────────────────────────────────
const ADMIN_SESSION_PREFIX = "s.";
const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashSession(token: string): string {
  return createHash("sha256").update(`admin-session:${token}`).digest("hex");
}

export async function createAdminSession(
  identity: AdminIdentity,
  info: { ip?: string | null; userAgent?: string | null } = {},
): Promise<string> {
  await ensureAdminSchema();
  const raw = randomBytes(32).toString("base64url");
  const now = Date.now();
  await db.insert(adminSessions).values({
    tokenHash: hashSession(raw),
    actor: identity.name,
    role: identity.role,
    ip: info.ip?.slice(0, 80) ?? null,
    userAgent: info.userAgent?.slice(0, 300) ?? null,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_MS,
  });
  return `${ADMIN_SESSION_PREFIX}${raw}`;
}

async function identityFromSession(rawToken: string): Promise<AdminIdentity | null> {
  try {
    await ensureAdminSchema();
    const rows = await db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.tokenHash, hashSession(rawToken)),
          isNull(adminSessions.revokedAt),
          gt(adminSessions.expiresAt, Date.now()),
        ),
      )
      .limit(1);
    const session = rows[0];
    if (!session) return null;
    if (!(await isAdminIpAllowed())) return null;
    // Best-effort last-seen update; never block the request.
    void db
      .update(adminSessions)
      .set({ lastSeenAt: Date.now() })
      .where(eq(adminSessions.id, session.id))
      .catch(() => undefined);
    return { name: session.actor, role: isAdminRole(session.role) ? session.role : "owner" };
  } catch {
    return null;
  }
}

export async function revokeAdminSession(id: number): Promise<void> {
  try {
    await ensureAdminSchema();
    await db
      .update(adminSessions)
      .set({ revokedAt: Date.now() })
      .where(eq(adminSessions.id, id));
  } catch {
    // ignore
  }
}

export async function revokeCurrentAdminSession(): Promise<void> {
  try {
    const store = await cookies();
    const value = store.get(ADMIN_COOKIE)?.value;
    if (!value || !value.startsWith(ADMIN_SESSION_PREFIX)) return;
    await ensureAdminSchema();
    await db
      .update(adminSessions)
      .set({ revokedAt: Date.now() })
      .where(eq(adminSessions.tokenHash, hashSession(value.slice(ADMIN_SESSION_PREFIX.length))));
  } catch {
    // ignore
  }
}

export async function listAdminSessions(): Promise<AdminSession[]> {
  try {
    await ensureAdminSchema();
    return await db
      .select()
      .from(adminSessions)
      .where(isNull(adminSessions.revokedAt))
      .orderBy(desc(adminSessions.lastSeenAt))
      .limit(100);
  } catch {
    return [];
  }
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminIdentity()) !== null;
}

// True when the current identity holds the capability. Server actions call
// this before mutating; pages use it to redirect/hide sections.
export async function can(capability: Capability): Promise<boolean> {
  const identity = await getAdminIdentity();
  return identity ? roleCan(identity.role, capability) : false;
}

// Brute-force guard on the login form (per IP, per instance — enough to
// make guessing infeasible for an opportunistic attacker).
export async function checkLoginRateLimit(): Promise<boolean> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-vercel-forwarded-for-ip")?.split(",")[0].trim() ??
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  return rateLimit(`login:${ip}`, 5, 10 * 60 * 1000).ok;
}

// ── Admin ops schema (audit + settings) ────────────────────────────────
// Delegates to the shared self-healing DDL helper (src/db/ensure-admin-schema).
export async function ensureOpsSchema(): Promise<void> {
  return ensureAdminSchema();
}

// Best-effort audit trail. Never let a logging failure block the mutation
// it describes — visibility is valuable, but correctness comes first.
// `snapshots` stores before/after JSON for rollback of tool edits.
function serializeSnapshot(value: unknown): string | null {
  if (value === undefined) return null;
  try {
    const json = JSON.stringify(value);
    return json.length > 20000 ? json.slice(0, 20000) : json;
  } catch {
    return null;
  }
}

export async function logAudit(
  action: string,
  target = "",
  detail = "",
  snapshots?: { before?: unknown; after?: unknown },
): Promise<number | null> {
  try {
    const identity = await getAdminIdentity();
    await ensureOpsSchema();
    const inserted = await db
      .insert(adminAudit)
      .values({
        actor: identity ? `${identity.role}:${identity.name}` : "system",
        action: action.slice(0, 80),
        target: target.slice(0, 200),
        detail: detail.slice(0, 1000),
        beforeJson: serializeSnapshot(snapshots?.before),
        afterJson: serializeSnapshot(snapshots?.after),
        createdAt: Date.now(),
      })
      .returning({ id: adminAudit.id });
    return inserted[0]?.id ?? null;
  } catch {
    return null;
  }
}
