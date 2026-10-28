import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { aiUsage } from "@/db/schema";
import { getUserAccess, type UserAccess } from "@/lib/entitlements";

// Kuota harian AI review. Anonim: cookie anon id. Gratis (login): lebih longgar.
// Pro/lifetime/tim: tidak dibatasi (limit harian tinggi sebagai anti-abuse).

const DAY_MS = 24 * 60 * 60 * 1000;

export const QUOTA = { anon: 3, free: 5, pro: 200 } as const;

export async function countUsage24h(opts: { userId?: number; anonId?: string }): Promise<number> {
  const since = Date.now() - DAY_MS;
  const where = opts.userId
    ? and(eq(aiUsage.userId, opts.userId), gte(aiUsage.createdAt, since))
    : opts.anonId
      ? and(eq(aiUsage.anonId, opts.anonId), isNull(aiUsage.userId), gte(aiUsage.createdAt, since))
      : null;
  if (!where) return 0;
  try {
    const rows = await db.select({ id: aiUsage.id }).from(aiUsage).where(where);
    return rows.length;
  } catch {
    // Tabel ai_usage belum ada → biarkan lewat (limit 0 tak memblokir UX).
    return 0;
  }
}

export async function recordUsage(opts: { userId?: number; anonId?: string; kind?: string }): Promise<void> {
  try {
    await db.insert(aiUsage).values({
      userId: opts.userId ?? null,
      anonId: opts.userId ? null : (opts.anonId ?? null),
      kind: opts.kind ?? "review",
      createdAt: Date.now(),
    });
  } catch {
    // Tabel belum ada — kuota gagal tercatat, tapi review tetap terkirim.
  }
}

export interface QuotaCheck {
  allowed: boolean;
  limit: number | null; // null = unlimited
  used: number;
  tier: UserAccess["tier"];
  resetInMinutes: number;
}

export async function checkReviewQuota(opts: {
  userId: number | null;
  anonId: string | null;
}): Promise<QuotaCheck> {
  const access = await getUserAccess(opts.userId);
  const used = await countUsage24h({ userId: opts.userId ?? undefined, anonId: opts.anonId ?? undefined });
  const limit =
    access.tier === "pro"
      ? QUOTA.pro
      : opts.userId
        ? QUOTA.free
        : QUOTA.anon;
  return {
    allowed: used < limit,
    limit,
    used,
    tier: access.tier,
    // Reset fixed-window harian: sisa menit sampai 24 jam dari pemakaian pertama
    // — praktisnya kami hitung dari "sekarang + window" sederhana.
    resetInMinutes: Math.ceil(DAY_MS / 60_000),
  };
}
