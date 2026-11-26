import { cookies, headers } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/db/client";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";
import { adminAudit } from "@/db/schema";
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

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const entries = parseEntries();
  if (entries.length === 0) return null;
  const store = await cookies();
  const provided = store.get(ADMIN_COOKIE)?.value;
  if (!provided) return null;
  for (const entry of entries) {
    if (safeEqual(provided, tokenDigest(entry.token))) {
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
export async function logAudit(action: string, target = "", detail = ""): Promise<void> {
  try {
    const identity = await getAdminIdentity();
    await ensureOpsSchema();
    await db.insert(adminAudit).values({
      actor: identity ? `${identity.role}:${identity.name}` : "system",
      action: action.slice(0, 80),
      target: target.slice(0, 200),
      detail: detail.slice(0, 1000),
      createdAt: Date.now(),
    });
  } catch {
    // ignore
  }
}
