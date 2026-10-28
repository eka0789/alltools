import { TEMPLATES, type TemplateDef } from "@/data/templates";

// AktifKoding Pro — katalog produk yang bisa dibeli. Statis di kode (tanpa
// CRUD admin): harga berubah hanya lewat commit. Order menyimpan productId
// di sini; webhook DOKU memvalidasinya terhadap katalog.

export type ProductKind = "lifetime" | "team" | "template";

export interface Product {
  id: string;
  kind: ProductKind;
  name: string;
  priceIdr: number;
  seats?: number; // untuk kind "team"
  templateSlug?: string; // untuk kind "template"
  description: string;
  features: string[];
}

export const LIFETIME_PRODUCT: Product = {
  id: "pro_lifetime",
  kind: "lifetime",
  name: "Pro Lifetime Access",
  priceIdr: 299000,
  description: "Sekali bayar, akses semua template premium + AI review tanpa batas selamanya.",
  features: [
    "Semua template premium (sekarang & mendatang)",
    "AI code review tanpa batas harian",
    "Unduh ulang kapan pun",
    "Update template selamanya",
  ],
};

export const TEAM_PRODUCT: Product = {
  id: "team_10",
  kind: "team",
  name: "Paket Tim — 10 seat",
  priceIdr: 1290000,
  seats: 10,
  description: "Untuk tim engineering: 10 seat berisi semua benefit Pro, plus kolaborasi template & invite anggota.",
  features: [
    "Semua benefit Pro untuk 10 seat",
    "Invite anggota tim via email (auto-join saat login)",
    "AI review untuk seluruh anggota",
    "Lisensi penggunaan komersial untuk proyek klien",
  ],
};

export function templateProduct(t: TemplateDef): Product {
  return {
    id: `tpl:${t.slug}`,
    kind: "template",
    name: t.name,
    priceIdr: t.priceIdr,
    templateSlug: t.slug,
    description: t.tagline,
    features: t.highlights,
  };
}

export const TEMPLATE_PRODUCTS: Product[] = TEMPLATES.filter((t) => t.priceIdr > 0).map(templateProduct);

export const PRODUCTS: Product[] = [LIFETIME_PRODUCT, TEAM_PRODUCT, ...TEMPLATE_PRODUCTS];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: string): Product | undefined {
  return BY_ID.get(id);
}

// Format IDR ringkas untuk UI.
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
