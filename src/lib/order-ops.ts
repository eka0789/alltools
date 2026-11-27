import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { entitlements, orders, type Order } from "@/db/schema";
import { logOrderEvent } from "@/lib/order-events";
import { notifyAdmin } from "@/lib/notifications";

// Refund execution shared by the direct admin actions and the four-eyes
// approval flow. Callers own the audit entry.

async function revokeOrderEntitlements(orderId: number, now: number): Promise<void> {
  const rows = await db
    .select({ teamId: entitlements.teamId })
    .from(entitlements)
    .where(eq(entitlements.orderId, orderId));
  const teamIds = [...new Set(rows.map((r) => r.teamId).filter((id): id is number => id !== null))];
  const scope =
    teamIds.length > 0
      ? or(eq(entitlements.orderId, orderId), inArray(entitlements.teamId, teamIds))
      : eq(entitlements.orderId, orderId);
  await db
    .update(entitlements)
    .set({ revokedAt: now })
    .where(and(scope, isNull(entitlements.revokedAt)));
}

export async function performFullRefund(order: Order): Promise<void> {
  const now = Date.now();
  await db
    .update(orders)
    .set({
      status: "refunded",
      refundedAmount: order.amount,
      refundReason: order.refundReason ?? "Full refund (admin)",
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));
  await revokeOrderEntitlements(order.id, now);
  await logOrderEvent(order.id, "refunded", `Full refund ${order.amount} IDR`);
  await notifyAdmin({
    type: "order_refund",
    severity: "warning",
    title: `Refund penuh: ${order.invoiceNo}`,
    body: `${order.amount} IDR`,
    link: `/admin/orders/${order.invoiceNo}`,
  });
}

export async function performPartialRefund(
  order: Order,
  amount: number,
  reason: string,
): Promise<{ full: boolean }> {
  const remaining = order.amount - order.refundedAmount;
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
    throw new Error("invalid-amount");
  }
  const newRefunded = order.refundedAmount + amount;
  const full = newRefunded >= order.amount;
  await db
    .update(orders)
    .set({
      refundedAmount: newRefunded,
      refundReason: reason || order.refundReason,
      status: full ? "refunded" : "paid",
      updatedAt: Date.now(),
    })
    .where(eq(orders.id, order.id));

  if (full) {
    await revokeOrderEntitlements(order.id, Date.now());
  }

  await logOrderEvent(
    order.id,
    full ? "refunded" : "partial_refund",
    `${amount} IDR — ${reason || "no reason"}`,
  );
  await notifyAdmin({
    type: "order_refund",
    severity: "warning",
    title: `${full ? "Refund penuh" : "Refund sebagian"}: ${order.invoiceNo}`,
    body: `${amount} IDR — ${reason || "-"}`,
    link: `/admin/orders/${order.invoiceNo}`,
  });
  return { full };
}
