import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { orders } from "@/db/schema";
import { dokuConfig, fetchDokuOrderStatus } from "@/lib/doku";
import { finalizeOrderIfPaid } from "@/lib/entitlements";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOUR_MS = 60 * 60 * 1000;
const BATCH = 25;

// Rekonsiliasi pembayaran (Vercel Cron per jam): order pending > 1 jam
// ditanyakan statusnya langsung ke DOKU — webhook bisa hilang, tapi uang
// tidak boleh. PAID → finalize + entitlement + email struk; EXPIRED →
// ditandai expired. Tanpa kredensial DOKU route ini no-op.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!DB_ACTIVE) {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
  if (!rateLimit(`cron-reconcile:${clientIp(req)}`, 4, 60_000).ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const config = dokuConfig();
  if (!config) {
    return NextResponse.json({ ok: true, skipped: "doku-not-configured" });
  }

  const pending = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        lt(orders.createdAt, Date.now() - HOUR_MS),
      ),
    )
    .limit(BATCH);

  let paid = 0;
  let expired = 0;
  let stillPending = 0;
  for (const order of pending) {
    const { status } = await fetchDokuOrderStatus(config, order.invoiceNo, order.amount);
    if (status === "PAID") {
      await finalizeOrderIfPaid(order, JSON.stringify({ source: "reconcile-cron", ts: Date.now() }));
      paid += 1;
    } else if (status === "EXPIRED" || status === "FAILED") {
      await db
        .update(orders)
        .set({ status: "expired", updatedAt: Date.now() })
        .where(eq(orders.id, order.id));
      expired += 1;
    } else {
      stillPending += 1;
    }
  }
  return NextResponse.json({ ok: true, checked: pending.length, paid, expired, stillPending });
}

// Vercel Cron mengirim GET — alias ke handler yang sama.
export const GET = POST;
