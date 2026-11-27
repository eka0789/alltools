import { redirect } from "next/navigation";
import { db, DB_ACTIVE } from "@/db/client";
import { productOverrides, type ProductOverride } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatIdr } from "@/lib/products";
import { getEffectiveProducts, type EffectiveProduct } from "@/lib/product-overrides";
import { resetProductAction, updateProductAction } from "./actions";

export const dynamic = "force-dynamic";

function datetimeLocal(ms: number | null | undefined): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 16);
}

function ProductCard({
  product,
  override,
}: {
  product: EffectiveProduct;
  override: ProductOverride | undefined;
}) {
  const basePriceLabel =
    product.compareAtPriceIdr && product.compareAtPriceIdr > product.priceIdr
      ? `${formatIdr(product.priceIdr)} (cored Rp ${product.compareAtPriceIdr.toLocaleString("id-ID")})`
      : formatIdr(product.priceIdr);

  return (
    <details className="card p-4" open={Boolean(override)}>
      <summary className="cursor-pointer">
        <span className="font-medium">{product.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{product.id}</span>
        <span className="ml-2 text-xs font-semibold text-accent">{basePriceLabel}</span>
        {override && (
          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">
            overridden
          </span>
        )}
        {!product.active && (
          <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">
            nonaktif
          </span>
        )}
      </summary>

      <form action={updateProductAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="productId" value={product.id} />
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
            Nama tampilan (opsional)
          </span>
          <input
            name="name"
            defaultValue={override?.name ?? ""}
            placeholder={product.name}
            className="input text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
            Harga normal (IDR)
          </span>
          <input
            name="priceIdr"
            type="number"
            min={0}
            defaultValue={override?.priceIdr ?? ""}
            placeholder={String(product.priceIdr)}
            className="input text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
            Harga promo (IDR)
          </span>
          <input
            name="promoPriceIdr"
            type="number"
            min={0}
            defaultValue={override?.promoPriceIdr ?? ""}
            className="input text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
            Promo mulai
          </span>
          <input
            name="promoStartsAt"
            type="datetime-local"
            defaultValue={datetimeLocal(override?.promoStartsAt)}
            className="input text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
            Promo berakhir
          </span>
          <input
            name="promoEndsAt"
            type="datetime-local"
            defaultValue={datetimeLocal(override?.promoEndsAt)}
            className="input text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={override ? override.active : true}
            className="h-4 w-4"
          />
          Produk aktif (bisa dibeli)
        </label>
        <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          {override && (
            <button
              type="submit"
              formAction={resetProductAction}
              className="btn-secondary !px-2.5 !py-1 text-xs text-destructive"
            >
              Reset ke base
            </button>
          )}
          <button type="submit" className="btn-primary !px-3 !py-1 text-xs">
            Simpan
          </button>
        </div>
      </form>
    </details>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const products = await getEffectiveProducts();

  let overrides: ProductOverride[] = [];
  if (DB_ACTIVE) {
    try {
      overrides = await db.select().from(productOverrides);
    } catch {
      overrides = [];
    }
  }
  const overrideByProduct = new Map(overrides.map((row) => [row.productId, row]));

  const lifetime = products.filter((p) => p.kind === "lifetime");
  const team = products.filter((p) => p.kind === "team");
  const templates = products.filter((p) => p.kind === "template");

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Produk & Harga</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Override harga, jadwalkan promo, dan nonaktifkan produk tanpa deploy. Base price
          tetap dari <code className="rounded bg-muted px-1 py-0.5">src/lib/products.ts</code>.
          Perubahan berlaku ≤30 detik (cache) dan langsung dipakai checkout.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "saved" && "Override produk disimpan."}
          {sp.ok === "reset" && "Override dihapus — kembali ke harga base."}
        </p>
      )}
      {sp.error === "validation" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Produk tidak valid.
        </p>
      )}

      <h2 className="mt-7 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Langganan & paket
      </h2>
      <div className="mt-3 space-y-3">
        {[...lifetime, ...team].map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            override={overrideByProduct.get(product.id)}
          />
        ))}
      </div>

      <h2 className="mt-9 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Template ({templates.length})
      </h2>
      <div className="mt-3 space-y-3">
        {templates.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            override={overrideByProduct.get(product.id)}
          />
        ))}
      </div>
    </div>
  );
}
