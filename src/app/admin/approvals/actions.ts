"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan, type AdminIdentity } from "@/lib/admin";
import { decideApproval, getApproval, parsePayload } from "@/lib/approvals";
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
    await decideApproval(id, identity.name, "rejected", note);
    await logAudit("approval.reject", `approval:${id}`, `${approval.kind} ${approval.target}`);
    revalidatePath("/admin/approvals");
    redirect("/admin/approvals?ok=rejected");
  }

  try {
    if (approval.kind === "refund") {
      const payload = parsePayload<RefundPayload>(approval.payload);
      if (!payload?.orderId) redirect("/admin/approvals?error=payload");
      const order = (
        await db.select().from(orders).where(eq(orders.id, payload.orderId)).limit(1)
      )[0];
      if (!order) redirect("/admin/approvals?error=missing");
      if (payload.mode === "full") {
        await performFullRefund(order);
      } else {
        await performPartialRefund(order, Number(payload.amount ?? 0), payload.reason ?? "");
      }
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${order.invoiceNo}`);
      revalidatePath("/admin/users");
    } else if (approval.kind === "price") {
      const payload = parsePayload<ProductOverrideInput & { reset?: boolean }>(approval.payload);
      if (!payload?.productId) redirect("/admin/approvals?error=payload");
      if (payload.reset) {
        await clearProductOverride(payload.productId);
      } else {
        await setProductOverride(payload);
      }
      revalidatePath("/admin/products");
      revalidatePath("/pricing");
      revalidatePath("/templates");
    } else {
      redirect("/admin/approvals?error=unknown");
    }
  } catch {
    redirect("/admin/approvals?error=execute");
  }

  await decideApproval(id, identity.name, "approved", note);
  await logAudit(
    "approval.approve",
    `approval:${id}`,
    `${approval.kind} ${approval.target} executed`,
  );
  revalidatePath("/admin/approvals");
  redirect("/admin/approvals?ok=approved");
}
