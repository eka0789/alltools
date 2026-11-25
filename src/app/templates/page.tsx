import type { Metadata } from "next";
import Link from "next/link";
import { TEMPLATES } from "@/data/templates";
import { formatIdr, discountPercent } from "@/lib/products";
import { getSessionUser } from "@/lib/auth";
import { canDownloadTemplate, getUserAccess } from "@/lib/entitlements";
import { CustomServiceCta } from "@/components/custom-service-cta";
import { TemplatesBrowser, type TemplateCardItem } from "./templates-browser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Template Proyek",
  description:
    "Template proyek siap produksi: SaaS starter, Clean Architecture API, admin dashboard, dan lainnya. Unduh ZIP, mulai coding dalam hitungan menit.",
  alternates: { canonical: "/templates" },
};

export default async function TemplatesPage() {
  const user = await getSessionUser();
  const access = await getUserAccess(user?.id ?? null);

  const items: TemplateCardItem[] = TEMPLATES.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    tags: t.tags,
    priceIdr: t.priceIdr,
    compareAtPriceIdr: t.compareAtPriceIdr,
    discountPct: discountPercent(t.priceIdr, t.compareAtPriceIdr),
    priceFormatted: t.priceIdr === 0 ? "Gratis" : formatIdr(t.priceIdr),
    compareAtFormatted:
      t.compareAtPriceIdr && t.compareAtPriceIdr > t.priceIdr
        ? formatIdr(t.compareAtPriceIdr)
        : null,
    unlocked: canDownloadTemplate(access, t.slug),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Template Proyek</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Titik mulai yang benar menghemat berhari-hari setup. Semua template
          dihasilkan dari generator AktifKoding — selalu konsisten, mudah
          diperbarui. Template gratis terbuka untuk semua.
        </p>
      </header>
      <TemplatesBrowser items={items} />
      <CustomServiceCta />
      <p className="mt-6 text-xs text-muted-foreground">
        Butuh semuanya?{" "}
        <Link href="/pricing" className="text-accent hover:underline">
          Pro Lifetime
        </Link>{" "}
        membuka semua template + AI review tanpa batas, sekali bayar.
      </p>
    </div>
  );
}
