"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { clearProductOverride, setProductOverride } from "@/lib/product-overrides";

async function requireBilling() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");
}

function parseDate(raw: string): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return Math.max(0, Math.round(Number(trimmed) || 0));
}

function after() {
  revalidatePath("/admin/products");
  revalidatePath("/pricing");
  revalidatePath("/templates");
  revalidatePath("/account");
}

export async function updateProductAction(formData: FormData) {
  await requireBilling();
  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) redirect("/admin/products?error=validation");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120) || null;
  const priceIdr = parseAmount(String(formData.get("priceIdr") ?? ""));
  const promoPriceIdr = parseAmount(String(formData.get("promoPriceIdr") ?? ""));
  const promoStartsAt = parseDate(String(formData.get("promoStartsAt") ?? ""));
  const promoEndsAt = parseDate(String(formData.get("promoEndsAt") ?? ""));
  const active = formData.get("active") === "on";

  await setProductOverride({
    productId,
    name,
    priceIdr,
    promoPriceIdr,
    promoStartsAt,
    promoEndsAt,
    active,
  });
  await logAudit(
    "product.update",
    `product:${productId}`,
    `price=${priceIdr ?? "base"} promo=${promoPriceIdr ?? "-"} active=${active}`,
  );
  after();
  redirect("/admin/products?ok=saved");
}

export async function resetProductAction(formData: FormData) {
  await requireBilling();
  const productId = String(formData.get("productId") ?? "").trim();
  if (productId) {
    await clearProductOverride(productId);
    await logAudit("product.reset", `product:${productId}`, "Override dihapus (kembali ke base)");
    after();
  }
  redirect("/admin/products?ok=reset");
}
