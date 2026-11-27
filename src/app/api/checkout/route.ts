import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveProduct } from "@/lib/product-overrides";
import { getUserAccess } from "@/lib/entitlements";
import { createDokuPayment, dokuConfig, dokuConfigured, dokuSimulationAllowed } from "@/lib/doku";
import { siteUrl } from "@/lib/email";
import { clientIp, rateLimitPersistent } from "@/lib/rate-limit";
import { validateCoupon } from "@/lib/coupons";
import { isCheckoutEnabled } from "@/lib/settings";
import { logOrderEvent } from "@/lib/order-events";

export const runtime = "nodejs";

function invoiceNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `AK-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

// POST /api/checkout — { productId }
// Membuat order pending lalu mengambil URL pembayaran DOKU. Tanpa
// kredensial DOKU di lingkungan non-produksi, order menunggu tombol
// simulasi (mengemulasi webhook) sehingga alur lengkap tetap teruji.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "login-required", loginUrl: "/login?next=/pricing" }, { status: 401 });
  }
  if (!(await rateLimitPersistent(`checkout:${clientIp(req)}`, 10, 60_000)).ok) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }
  // Admin kill switch (Settings → Checkout aktif). Missing setting = enabled.
  if (!(await isCheckoutEnabled())) {
    return Response.json({ error: "checkout-disabled" }, { status: 503 });
  }

  let productId = "";
  let rawCoupon = "";
  try {
    const body = (await req.json()) as { productId?: string; couponCode?: string };
    productId = String(body.productId ?? "");
    rawCoupon = String(body.couponCode ?? "").trim();
  } catch {
    productId = "";
  }
  const product = await getEffectiveProduct(productId);
  if (!product || !product.active) {
    return Response.json({ error: "product-not-found" }, { status: 400 });
  }

  // Cegah pembelian ganda untuk produk yang sudah dimiliki user.
  const access = await getUserAccess(user.id);
  const alreadyOwned =
    (product.kind === "lifetime" && access.hasLifetime) ||
    (product.kind === "template" && (access.hasLifetime || access.templateIds.includes(product.id)));
  if (alreadyOwned) {
    return Response.json({ error: "already-owned" }, { status: 409 });
  }

  let finalAmount = product.priceIdr;
  let discountAmount = 0;
  let appliedCouponCode: string | null = null;

  if (rawCoupon) {
    const couponRes = await validateCoupon(rawCoupon, product.priceIdr);
    if (!couponRes.valid) {
      return Response.json({ error: `coupon-${couponRes.error}` }, { status: 400 });
    }
    finalAmount = couponRes.finalAmount;
    discountAmount = couponRes.discountAmount;
    appliedCouponCode = couponRes.coupon.code;
  }

  const now = Date.now();
  const invoice = invoiceNumber();
  const inserted = await db
    .insert(orders)
    .values({
      invoiceNo: invoice,
      userId: user.id,
      productId: product.id,
      amount: finalAmount,
      couponCode: appliedCouponCode,
      discountAmount,
      status: "pending",
      provider: dokuConfigured() ? "doku" : "manual",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const order = inserted[0];
  await logOrderEvent(order.id, "created", `${product.name} — ${finalAmount} IDR`);

  const config = dokuConfig();
  if (config) {
    const result = await createDokuPayment(config, {
      invoiceNumber: invoice,
      amount: finalAmount,
      customer: { name: user.email.split("@")[0], email: user.email },
      lineItems: [{ name: product.name, price: finalAmount, quantity: 1 }],
      callbackUrl: `${siteUrl()}/checkout/${invoice}`,
    });
    if (result.ok && result.paymentUrl) {
      await db
        .update(orders)
        .set({ paymentUrl: result.paymentUrl, updatedAt: Date.now() })
        .where(eq(orders.id, order.id));
      return Response.json({ ok: true, invoice, paymentUrl: result.paymentUrl });
    }
    await db
      .update(orders)
      .set({ status: "failed", updatedAt: Date.now() })
      .where(eq(orders.id, order.id));
    return Response.json({ error: result.error ?? "doku-error" }, { status: 502 });
  }

  if (dokuSimulationAllowed()) {
    return Response.json({ ok: true, invoice, paymentUrl: `/checkout/${invoice}`, simulated: true });
  }
  // Produksi tanpa kredensial: order tersimpan, tapi tidak ada jalur bayar.
  return Response.json({ error: "payment-not-configured", invoice }, { status: 503 });
}

// POST /api/checkout/simulate — hanya non-produksi: mengemulasi webhook DOKU
// untuk order pending milik sesi ini.
export async function PUT(req: NextRequest) {
  if (!dokuSimulationAllowed()) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "login-required" }, { status: 401 });
  const invoice = req.nextUrl.searchParams.get("invoice") ?? "";
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.invoiceNo, invoice), eq(orders.userId, user.id)))
    .limit(1);
  const order = rows[0];
  if (!order) return Response.json({ error: "not-found" }, { status: 404 });
  if (order.status === "paid") return Response.json({ ok: true, alreadyPaid: true });
  const { finalizeOrderIfPaid } = await import("@/lib/entitlements");
  await finalizeOrderIfPaid(order, JSON.stringify({ simulated: true, ts: Date.now() }));
  return Response.json({ ok: true });
}

export function GET() {
  return Response.json({ error: "method-not-allowed" }, { status: 405 });
}
