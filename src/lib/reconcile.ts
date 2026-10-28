import { and, eq, lt } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { orders } from "@/db/schema";
import { dokuConfig, fetchDokuOrderStatus } from "@/lib/doku";
import { finalizeOrderIfPaid } from "@/lib/entitlements";

// Rekonsiliasi pembayaran: order pending > 1 jam ditanyakan statusnya
// langsung ke DOKU — webhook bisa hilang, tapi uang tidak boleh.
// PAID → finalize + entitlement + email struk; EXPIRED/FAILED → ditandai.
// Dipanggil cron harian (check-links tail) dan route /api/cron/reconcile-orders
// (manual/programmatic). Tanpa kredensial DOKU: no-op.

const HOUR_MS = 60 * 60 * 1000;

export async function reconcilePendingOrders(limit = 25): Promise<{
  checked: number;
  paid: number;
  expired: number;
  stillPending: number;
  skipped?: string;
}> {
  if (!DB_ACTIVE) return { checked: 0, paid: 0, expired: 0, stillPending: 0, skipped: "database-unavailable" };
  const config = dokuConfig();
  if (!config) return { checked: 0, paid: 0, expired: 0, stillPending: 0, skipped: "doku-not-configured" };

  const pending = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        lt(orders.createdAt, Date.now() - HOUR_MS),
      ),
    )
    .limit(limit);

  let paid = 0;
  let expired = 0;
  let stillPending = 0;
  for (const order of pending) {
    const { status } = await fetchDokuOrderStatus(config, order.invoiceNo, order.amount);
    if (status === "PAID") {
      await finalizeOrderIfPaid(order, JSON.stringify({ source: "reconcile", ts: Date.now() }));
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
  return { checked: pending.length, paid, expired, stillPending };
}
