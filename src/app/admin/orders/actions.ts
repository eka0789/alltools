"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, type Order } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan, type AdminIdentity } from "@/lib/admin";
import { finalizeOrderIfPaid, sendReceiptEmail } from "@/lib/entitlements";
import { logOrderEvent } from "@/lib/order-events";
import { approvalRequired, createApproval } from "@/lib/approvals";
import { performFullRefund, performPartialRefund } from "@/lib/order-ops";

async function requireBilling(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");
  return identity;
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
  const identity = await requireBilling();
  const id = Number(formData.get("id") ?? 0);
  const order = await getOrder(id);
  if (!order) redirect("/admin/orders?error=not_found");

  const now = Date.now();
  if (order.status === "paid") {
    if (approvalRequired("refund")) {
      await createApproval({
        kind: "refund",
        target: order.invoiceNo,
        payload: { orderId: order.id, mode: "full" },
        summary: `Refund penuh ${order.amount} IDR — ${order.invoiceNo}`,
        requestedBy: identity.name,
      });
      redirect("/admin/approvals?queued=1");
    }

    await performFullRefund(order);
    await logAudit(
      "order.refund",
      `order:${order.invoiceNo}`,
      "Refunded; entitlements revoked",
    );
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${order.invoiceNo}`);
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    redirect("/admin/orders?ok=refunded");
  }

  if (order.status !== "pending") {
    redirect("/admin/orders?error=not_pending");
  }

  await db.update(orders).set({ status: "failed", updatedAt: now }).where(eq(orders.id, id));
  await logOrderEvent(order.id, "failed", "Cancelled by admin");
  await logAudit("order.void", `order:${order.invoiceNo}`, "Cancelled pending order");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect("/admin/orders?ok=voided");
}

// Partial refund: records the amount, keeps the order paid unless the full
// amount has been refunded, and revokes entitlements only on the full amount.
// With ADMIN_REQUIRE_APPROVAL=refund it becomes a pending approval instead.
export async function partialRefundAction(formData: FormData) {
  const identity = await requireBilling();
  const id = Number(formData.get("id") ?? 0);
  const amount = Math.round(Number(formData.get("amount") ?? 0));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const order = await getOrder(id);
  if (!order) redirect("/admin/orders?error=not_found");
  if (order.status !== "paid" && order.status !== "refunded") {
    redirect(`/admin/orders/${order.invoiceNo}?error=not_paid`);
  }

  const remaining = order.amount - order.refundedAmount;
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
    redirect(`/admin/orders/${order.invoiceNo}?error=refund_amount`);
  }

  if (approvalRequired("refund")) {
    await createApproval({
      kind: "refund",
      target: order.invoiceNo,
      payload: { orderId: order.id, mode: "partial", amount, reason },
      summary: `Refund sebagian ${amount} IDR — ${order.invoiceNo}`,
      requestedBy: identity.name,
    });
    redirect("/admin/approvals?queued=1");
  }

  let full = false;
  try {
    ({ full } = await performPartialRefund(order, amount, reason));
  } catch {
    redirect(`/admin/orders/${order.invoiceNo}?error=refund_amount`);
  }

  await logAudit(
    "order.refund",
    `order:${order.invoiceNo}`,
    `${full ? "Full" : "Partial"} refund ${amount} IDR`,
  );
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.invoiceNo}`);
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect(`/admin/orders/${order.invoiceNo}?ok=refunded`);
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
  await logOrderEvent(order.id, "receipt_resent", "Receipt email re-sent by admin");
  await logAudit("order.resend_receipt", `order:${order.invoiceNo}`, "Receipt email re-sent");
  redirect("/admin/orders?ok=receipt");
}
