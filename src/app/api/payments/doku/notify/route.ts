import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { dokuConfig, verifyDokuSignature, fetchDokuOrderStatus } from "@/lib/doku";
import { getProduct } from "@/lib/products";
import { finalizeOrderIfPaid } from "@/lib/entitlements";
import { logOrderEvent } from "@/lib/order-events";
import { notifyAdmin } from "@/lib/notifications";

export const runtime = "nodejs";

// Webhook Payment Notification DOKU. Selalu 200 untuk request valid format
// agar DOKU berhenti retry; 4xx hanya untuk body yang tak bisa diparse.
// Verifikasi dua lapis: (1) signature header bila cocok dengan salah satu
// format terdokumentasi, (2) bila tidak, konfirmasi status langsung ke
// Orders Status API DOKU (sumur kebenaran) sebelum memberi entitlement.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  let body: {
    order?: { invoice_number?: string; amount?: number | string };
    transaction?: { status?: string };
  };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Response.json({ error: "bad-json" }, { status: 400 });
    }
    body = parsed as typeof body;
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  const invoice = typeof body.order?.invoice_number === "string" ? body.order.invoice_number : "";
  if (!invoice) return Response.json({ error: "missing-invoice" }, { status: 400 });

  const rows = await db.select().from(orders).where(eq(orders.invoiceNo, invoice)).limit(1);
  const order = rows[0];
  if (!order) return Response.json({ ok: true }); // jangan bocorkan keberadaan

  if (order.status === "paid") return Response.json({ ok: true, alreadyPaid: true });

  if (body.order?.amount !== undefined) {
    const reportedAmount = Number(body.order.amount);
    if (!Number.isFinite(reportedAmount) || reportedAmount !== order.amount) {
      console.warn("[doku] amount mismatch", { invoice, expected: order.amount, got: body.order.amount });
      return Response.json({ ok: true, ignored: true });
    }
  }

  const config = dokuConfig();
  let trusted = false;
  let statusApiResult: "PAID" | "PENDING" | "EXPIRED" | "FAILED" | "UNKNOWN" | null = null;
  if (config) {
    const verified = verifyDokuSignature(
      config,
      {
        "client-id": req.headers.get("client-id") ?? undefined,
        "request-id": req.headers.get("request-id") ?? undefined,
        "request-timestamp": req.headers.get("request-timestamp") ?? undefined,
        "request-date": req.headers.get("request-date") ?? undefined,
        signature: req.headers.get("signature") ?? undefined,
        "x-signature": req.headers.get("x-signature") ?? undefined,
      },
      req.nextUrl.pathname,
      raw,
    );
    if (verified) {
      trusted = true;
    } else {
      // Signature tidak cocok → tanya langsung ke DOKU.
      const product = getProduct(order.productId);
      const status = await fetchDokuOrderStatus(config, invoice, order.amount);
      statusApiResult = status.status;
      if (status.status === "PAID" || status.status === "FAILED" || status.status === "EXPIRED") {
        trusted = true;
      }
      void product;
    }
  }

  if (!trusted) return Response.json({ ok: true, ignored: true });

  const reportedStatus = (body.transaction?.status ?? "").toUpperCase();
  const paidStatuses = new Set(["SUCCESS", "PAID", "COMPLETED", "FINISH"]);
  const failedStatuses = new Set(["FAILED", "DENIED", "CANCELED", "CANCELLED"]);
  const expiredStatuses = new Set(["EXPIRED", "ORDER_EXPIRED"]);

  const isPaid =
    statusApiResult === "PAID" || (statusApiResult === null && paidStatuses.has(reportedStatus));
  if (isPaid) {
    await finalizeOrderIfPaid(order, raw);
    return Response.json({ ok: true });
  }

  const isExpired =
    statusApiResult === "EXPIRED" || (statusApiResult === null && expiredStatuses.has(reportedStatus));
  const isFailed =
    statusApiResult === "FAILED" || (statusApiResult === null && failedStatuses.has(reportedStatus));
  if (isExpired || isFailed) {
    const nextStatus = isExpired ? "expired" : "failed";
    const updated = await db
      .update(orders)
      .set({
        status: nextStatus,
        providerPayload: raw,
        updatedAt: Date.now(),
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
      .returning({ id: orders.id });
    if (updated.length === 0) {
      return Response.json({ ok: true, alreadyFinalized: true });
    }
    await logOrderEvent(order.id, nextStatus, `DOKU reported ${nextStatus}`);
    await notifyAdmin({
      type: "payment_failed",
      severity: "warning",
      title: `Pembayaran ${nextStatus}: ${order.invoiceNo}`,
      body: `${order.amount} IDR — ${order.productId}`,
      link: `/admin/orders/${order.invoiceNo}`,
    });
    return Response.json({ ok: true, status: nextStatus });
  }

  return Response.json({ ok: true, ignored: true });
}
