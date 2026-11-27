import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orderEvents, type OrderEvent } from "@/db/schema";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";

// Order status timeline. Best-effort: a logging failure must never affect
// payment finalization or refunds.

export async function logOrderEvent(
  orderId: number,
  type: string,
  detail = "",
): Promise<void> {
  try {
    await ensureAdminSchema();
    await db.insert(orderEvents).values({
      orderId,
      type: type.slice(0, 40),
      detail: detail.slice(0, 500),
      createdAt: Date.now(),
    });
  } catch {
    // ignore
  }
}

export async function getOrderEvents(orderId: number): Promise<OrderEvent[]> {
  try {
    await ensureAdminSchema();
    return await db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, orderId))
      .orderBy(asc(orderEvents.createdAt));
  } catch {
    return [];
  }
}

export const ORDER_EVENT_LABEL: Record<string, string> = {
  created: "Order dibuat",
  paid: "Pembayaran diterima",
  expired: "Kedaluwarsa",
  failed: "Gagal / dibatalkan",
  refunded: "Refund penuh",
  partial_refund: "Refund sebagian",
  manual_paid: "Ditandai lunas manual",
  receipt_resent: "Receipt dikirim ulang",
};
