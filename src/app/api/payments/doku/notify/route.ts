import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { dokuConfig, verifyDokuSignature, fetchDokuOrderStatus } from "@/lib/doku";
import { getProduct } from "@/lib/products";
import { finalizeOrderIfPaid } from "@/lib/entitlements";

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
    body = JSON.parse(raw) as typeof body;
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  const invoice = body.order?.invoice_number ?? "";
  if (!invoice) return Response.json({ error: "missing-invoice" }, { status: 400 });

  const rows = await db.select().from(orders).where(eq(orders.invoiceNo, invoice)).limit(1);
  const order = rows[0];
  if (!order) return Response.json({ ok: true }); // jangan bocorkan keberadaan

  if (order.status === "paid") return Response.json({ ok: true, alreadyPaid: true });

  const config = dokuConfig();
  let trusted = false;
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
      if (status.status === "PAID") trusted = true;
      void product;
    }
  }

  const reportedStatus = (body.transaction?.status ?? "").toUpperCase();
  const paidNow = trusted && (reportedStatus === "PAID" || reportedStatus === "" || reportedStatus === "COMPLETED");
  if (!paidNow) return Response.json({ ok: true, ignored: true });

  await finalizeOrderIfPaid(order, raw);
  return Response.json({ ok: true });
}
