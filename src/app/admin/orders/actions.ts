"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { entitlements, orders, type Order } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { finalizeOrderIfPaid, sendReceiptEmail } from "@/lib/entitlements";

async function requireBilling() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");
}

async function getOrder(id: number): Promise<Order | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// Manual "mark paid" for bank transfers / offline payments. Reuses the same
// idempotent finalizer as the DOKU webhook, so entitlements and the receipt
// email behave identically.
export async function markOrderPaidAction(formData: FormData) {
  await requireBilling();
  const id = Number(formData.get("id") ?? 0);
  const order = await getOrder(id);
  if (!order) redirect("/admin/orders?error=not_found");
  if (order.status === "paid") redirect("/admin/orders?error=already_paid");
  if (order.status !== "pending") redirect("/admin/orders?error=not_pending");

  await finalizeOrderIfPaid(order, JSON.stringify({ source: "admin-manual", ts: Date.now() }));
  await logAudit(
    "order.mark_paid",
    `order:${order.invoiceNo}`,
    `Marked paid manually (${order.amount} IDR)`,
  );
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect("/admin/orders?ok=paid");
}

// Pending order → cancel (failed). Paid order → refund and revoke every
// entitlement granted by that order (revokedAt is honoured by getUserAccess).
export async function voidOrderAction(formData: FormData) {
  await requireBilling();
  const id = Number(formData.get("id") ?? 0);
  const order = await getOrder(id);
  if (!order) redirect("/admin/orders?error=not_found");

  const now = Date.now();
  if (order.status === "paid") {
    await db.update(orders).set({ status: "refunded", updatedAt: now }).where(eq(orders.id, id));
    await db
      .update(entitlements)
      .set({ revokedAt: now })
      .where(and(eq(entitlements.orderId, id), isNull(entitlements.revokedAt)));
    await logAudit(
      "order.refund",
      `order:${order.invoiceNo}`,
      "Refunded; entitlements revoked",
    );
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    redirect("/admin/orders?ok=refunded");
  }

  await db.update(orders).set({ status: "failed", updatedAt: now }).where(eq(orders.id, id));
  await logAudit("order.void", `order:${order.invoiceNo}`, "Cancelled pending order");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect("/admin/orders?ok=voided");
}

export async function resendReceiptAction(formData: FormData) {
  await requireBilling();
  const id = Number(formData.get("id") ?? 0);
  const order = await getOrder(id);
  if (!order) redirect("/admin/orders?error=not_found");
  if (order.status !== "paid") redirect("/admin/orders?error=not_paid");

  try {
    await sendReceiptEmail(order);
  } catch {
    redirect("/admin/orders?error=receipt_failed");
  }
  await logAudit("order.resend_receipt", `order:${order.invoiceNo}`, "Receipt email re-sent");
  redirect("/admin/orders?ok=receipt");
}
