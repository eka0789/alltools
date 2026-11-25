import { NextRequest } from "next/server";
import { getProduct } from "@/lib/products";
import { validateCoupon } from "@/lib/coupons";
import { clientIp, rateLimitPersistent } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/coupons/validate — { code, productId }
export async function POST(req: NextRequest) {
  if (!(await rateLimitPersistent(`coupon-val:${clientIp(req)}`, 20, 60_000)).ok) {
    return Response.json({ valid: false, error: "rate-limited" }, { status: 429 });
  }

  let code = "";
  let productId = "";
  try {
    const body = (await req.json()) as { code?: string; productId?: string };
    code = String(body.code ?? "");
    productId = String(body.productId ?? "");
  } catch {
    return Response.json({ valid: false, error: "bad-json" }, { status: 400 });
  }

  const product = getProduct(productId);
  if (!product) {
    return Response.json({ valid: false, error: "product-not-found" }, { status: 400 });
  }

  const result = await validateCoupon(code, product.priceIdr);
  if (!result.valid) {
    return Response.json({ valid: false, error: result.error }, { status: 200 });
  }

  return Response.json({
    valid: true,
    code: result.coupon.code,
    discountType: result.coupon.discountType,
    discountValue: result.coupon.discountValue,
    originalAmount: product.priceIdr,
    discountAmount: result.discountAmount,
    finalAmount: result.finalAmount,
  });
}
