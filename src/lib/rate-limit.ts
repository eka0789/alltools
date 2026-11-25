import { and, eq, lt, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { rateLimits } from "@/db/schema";

// Fixed-window in-memory rate limiter (fast path / fallback).
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Opportunistic cleanup so the map cannot grow without bound.
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

// Persistent fixed-window rate limiter backed by SQLite / Turso.
// Survives process restarts and shares budgets across serverless instances.
// Falls back to in-memory `rateLimit` when the DB is unavailable or unmigrated.
export async function rateLimitPersistent(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  if (!DB_ACTIVE) {
    return rateLimit(key, limit, windowMs);
  }

  const now = Date.now();
  const nextReset = now + windowMs;
  try {
    // Opportunistic cleanup (~1% of calls) so stale rows don't accumulate.
    if (Math.random() < 0.01) {
      void db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).catch(() => undefined);
    }

    const existing = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key))
      .limit(1);

    const row = existing[0];
    if (!row || row.resetAt <= now) {
      await db
        .insert(rateLimits)
        .values({ key, count: 1, resetAt: nextReset })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: { count: 1, resetAt: nextReset },
        });
      return { ok: true, retryAfter: 0 };
    }

    const updated = await db
      .update(rateLimits)
      .set({ count: sql`${rateLimits.count} + 1` })
      .where(and(eq(rateLimits.key, key), eq(rateLimits.resetAt, row.resetAt)))
      .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

    const count = updated[0]?.count ?? row.count + 1;
    const resetAt = updated[0]?.resetAt ?? row.resetAt;
    if (count > limit) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
    }
    return { ok: true, retryAfter: 0 };
  } catch {
    return rateLimit(key, limit, windowMs);
  }
}

export function clientIp(req: Request): string {
  // Trust model: on Vercel, x-vercel-forwarded-for-ip and x-forwarded-for are
  // set at the edge and client-supplied values are discarded — safe to use.
  // On hosts without an edge proxy a client could spoof either header, so
  // rate limits there are best-effort (as documented in the README).
  const vercel = req.headers.get("x-vercel-forwarded-for-ip");
  if (vercel) return vercel.split(",")[0].trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
