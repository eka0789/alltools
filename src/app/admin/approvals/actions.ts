"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan, type AdminIdentity } from "@/lib/admin";
import {
  decideApproval,
  getApproval,
  parsePayload,
  revertApprovalToPending,
} from "@/lib/approvals";
import { performFullRefund, performPartialRefund } from "@/lib/order-ops";
import {
  clearProductOverride,
  setProductOverride,
  type ProductOverrideInput,
} from "@/lib/product-overrides";

async function requireBilling(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");
  return identity;
}

interface RefundPayload {
  orderId: number;
  mode: "full" | "partial";
  amount?: number;
  reason?: string;
}

export async function decideApprovalAction(formData: FormData) {
  const identity = await requireBilling();
  const id = Number(formData.get("id") ?? 0);
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!id || (decision !== "approve" && decision !== "reject")) {
    redirect("/admin/approvals?error=invalid");
  }

  const approval = await getApproval(id);
  if (!approval || approval.status !== "pending") {
    redirect("/admin/approvals?error=not_pending");
  }
  // Four eyes: the requester cannot approve their own request.
  if (approval.requestedBy === identity.name) {
    redirect("/admin/approvals?error=same_admin");
  }

  if (decision === "reject") {
    const claimed = await decideApproval(id, identity.name, "rejected", note);
    if (!claimed) redirect("/admin/approvals?error=not_pending");
    await logAudit("approval.reject", `approval:${id}`, `${approval.kind} ${approval.target}`);
    revalidatePath("/admin/approvals");
    redirect("/admin/approvals?ok=rejected");
  }

  // Validate payload before claiming the approval row so malformed payloads
  // leave the queue state clean.
  let refundExec: { order: typeof orders.$inferSelect; payload: RefundPayload } | null = null;
  let pricePayload: (ProductOverrideInput & { reset?: boolean }) | null = null;

  if (approval.kind === "refund") {
    const payload = parsePayload<RefundPayload>(approval.payload);
    if (!payload?.orderId) redirect("/admin/approvals?error=payload");
    const order = (
      await db.select().from(orders).where(eq(orders.id, payload.orderId)).limit(1)
    )[0];
    if (!order) redirect("/admin/approvals?error=missing");
    refundExec = { order, payload };
  } else if (approval.kind === "price") {
    const payload = parsePayload<ProductOverrideInput & { reset?: boolean }>(approval.payload);
    if (!payload?.productId) redirect("/admin/approvals?error=payload");
    pricePayload = payload;
  } else {
    redirect("/admin/approvals?error=unknown");
  }

  // Atomically claim the pending approval before executing side effects so
  // concurrent approvals cannot double-refund an order.
  const claimed = await decideApproval(id, identity.name, "approved", note);
  if (!claimed) {
    redirect("/admin/approvals?error=not_pending");
  }

  try {
    if (refundExec) {
      const { order, payload } = refundExec;
      if (payload.mode === "full") {
        await performFullRefund(order);
      } else {
        await performPartialRefund(order, Number(payload.amount ?? 0), payload.reason ?? "");
      }
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${order.invoiceNo}`);
      revalidatePath("/admin/users");
    } else if (pricePayload) {
      if (pricePayload.reset) {
        await clearProductOverride(pricePayload.productId);
      } else {
        await setProductOverride(pricePayload);
      }
      revalidatePath("/admin/products");
      revalidatePath("/pricing");
      revalidatePath("/templates");
    }
  } catch (err) {
    unstable_rethrow(err);
    await revertApprovalToPending(id);
    redirect("/admin/approvals?error=execute");
  }

  await logAudit(
    "approval.approve",
    `approval:${id}`,
    `${approval.kind} ${approval.target} executed`,
  );
  revalidatePath("/admin/approvals");
  redirect("/admin/approvals?ok=approved");
}
