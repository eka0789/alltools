import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { productOverrides, type ProductOverride } from "@/db/schema";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";
import { PRODUCTS, getProduct as getBaseProduct, type Product } from "@/lib/products";

// Admin-editable overrides merged over the code-defined product catalog.
// This lets operators change prices, schedule a promo and hide a product
// without a deploy, while src/lib/products.ts remains the source of truth
// for kind/features/seat counts. Cached for 30s per instance.

export interface EffectiveProduct extends Product {
  active: boolean;
}

let cache: { at: number; map: Map<string, ProductOverride> } | null = null;
const TTL_MS = 30_000;

export function invalidateProductOverrides(): void {
  cache = null;
}

async function loadOverrides(): Promise<Map<string, ProductOverride>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  try {
    await ensureAdminSchema();
    const rows = await db.select().from(productOverrides);
    cache = { at: Date.now(), map: new Map(rows.map((row) => [row.productId, row])) };
  } catch {
    cache = { at: Date.now(), map: cache?.map ?? new Map() };
  }
  return cache.map;
}

export function applyOverride(
  base: Product,
  override: ProductOverride | undefined,
  now = Date.now(),
): EffectiveProduct {
  if (!override) return { ...base, active: true };

  const promoActive =
    override.promoPriceIdr != null &&
    override.promoPriceIdr > 0 &&
    (override.promoStartsAt == null || override.promoStartsAt <= now) &&
    (override.promoEndsAt == null || override.promoEndsAt >= now);

  const basePrice = override.priceIdr ?? base.priceIdr;
  const price = promoActive ? (override.promoPriceIdr as number) : basePrice;

  return {
    ...base,
    name: override.name ?? base.name,
    priceIdr: price,
    compareAtPriceIdr: promoActive ? basePrice : base.compareAtPriceIdr,
    active: override.active,
  };
}

export async function getEffectiveProduct(id: string): Promise<EffectiveProduct | null> {
  const base = getBaseProduct(id);
  if (!base) return null;
  const map = await loadOverrides();
  return applyOverride(base, map.get(id));
}

export async function getEffectiveProducts(): Promise<EffectiveProduct[]> {
  const map = await loadOverrides();
  return PRODUCTS.map((product) => applyOverride(product, map.get(product.id)));
}

export interface ProductOverrideInput {
  productId: string;
  name?: string | null;
  priceIdr?: number | null;
  promoPriceIdr?: number | null;
  promoStartsAt?: number | null;
  promoEndsAt?: number | null;
  active: boolean;
}

export async function setProductOverride(input: ProductOverrideInput): Promise<void> {
  await ensureAdminSchema();
  const now = Date.now();
  const values = {
    productId: input.productId,
    name: input.name?.trim() || null,
    priceIdr: input.priceIdr ?? null,
    promoPriceIdr: input.promoPriceIdr ?? null,
    promoStartsAt: input.promoStartsAt ?? null,
    promoEndsAt: input.promoEndsAt ?? null,
    active: input.active,
    updatedAt: now,
  };
  await db
    .insert(productOverrides)
    .values(values)
    .onConflictDoUpdate({
      target: productOverrides.productId,
      set: {
        name: values.name,
        priceIdr: values.priceIdr,
        promoPriceIdr: values.promoPriceIdr,
        promoStartsAt: values.promoStartsAt,
        promoEndsAt: values.promoEndsAt,
        active: values.active,
        updatedAt: now,
      },
    });
  invalidateProductOverrides();
}

export async function clearProductOverride(productId: string): Promise<void> {
  await ensureAdminSchema();
  await db.delete(productOverrides).where(eq(productOverrides.productId, productId));
  invalidateProductOverrides();
}
