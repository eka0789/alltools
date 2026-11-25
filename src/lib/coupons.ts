import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { coupons, type Coupon } from "@/db/schema";

const MIN_CHARGE_IDR = 1_000;

export function normalizeCouponCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}

export function calculateCouponDiscount(
  baseAmountIdr: number,
  coupon: Pick<Coupon, "discountType" | "discountValue">,
): { discountAmount: number; finalAmount: number } {
  if (baseAmountIdr <= 0) return { discountAmount: 0, finalAmount: 0 };

  const rawDiscount =
    coupon.discountType === "fixed"
      ? Math.max(0, Math.round(coupon.discountValue))
      : Math.round((baseAmountIdr * Math.min(95, Math.max(0, coupon.discountValue))) / 100);

  // DOKU requires a positive minimum charge; keep finalAmount >= Rp 1.000 when base >= 1.000.
  const floor = baseAmountIdr >= MIN_CHARGE_IDR ? MIN_CHARGE_IDR : baseAmountIdr;
  const finalAmount = Math.max(floor, baseAmountIdr - rawDiscount);
  const discountAmount = Math.max(0, baseAmountIdr - finalAmount);
  return { discountAmount, finalAmount };
}

export type CouponValidationResult =
  | {
      valid: true;
      coupon: Coupon;
      discountAmount: number;
      finalAmount: number;
    }
  | {
      valid: false;
      error:
        | "empty"
        | "not-found"
        | "inactive"
        | "expired"
        | "quota-exhausted"
        | "min-amount"
        | "unavailable";
    };

export async function validateCoupon(
  rawCode: string,
  baseAmountIdr: number,
): Promise<CouponValidationResult> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { valid: false, error: "empty" };

  try {
    const rows = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    const coupon = rows[0];
    if (!coupon) return { valid: false, error: "not-found" };
    if (!coupon.active) return { valid: false, error: "inactive" };
    if (coupon.expiresAt !== null && coupon.expiresAt <= Date.now()) {
      return { valid: false, error: "expired" };
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: "quota-exhausted" };
    }
    if (baseAmountIdr < coupon.minAmountIdr) {
      return { valid: false, error: "min-amount" };
    }

    const { discountAmount, finalAmount } = calculateCouponDiscount(baseAmountIdr, coupon);
    return { valid: true, coupon, discountAmount, finalAmount };
  } catch {
    return { valid: false, error: "unavailable" };
  }
}

// Atomically reserves one use of a coupon (checks active + quota in WHERE).
export async function consumeCouponUsage(code: string): Promise<boolean> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return false;
  try {
    const updated = await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(
        and(
          eq(coupons.code, normalized),
          eq(coupons.active, true),
          or(isNull(coupons.maxUses), lt(coupons.usedCount, coupons.maxUses)),
        ),
      )
      .returning({ id: coupons.id });
    return updated.length > 0;
  } catch {
    return false;
  }
}
