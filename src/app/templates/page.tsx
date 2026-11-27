import type { Metadata } from "next";
import Link from "next/link";
import { TEMPLATES } from "@/data/templates";
import { formatIdr, discountPercent } from "@/lib/products";
import { getEffectiveProducts } from "@/lib/product-overrides";
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

  const items: TemplateCardItem[] = await (async () => {
    const effective = await getEffectiveProducts();
    const overridesBySlug = new Map(
      effective
        .filter((product) => product.kind === "template" && product.templateSlug)
        .map((product) => [product.templateSlug as string, product]),
    );
    return TEMPLATES.map((t) => {
      const override = overridesBySlug.get(t.slug);
      const name = override?.name ?? t.name;
      const priceIdr = override?.priceIdr ?? t.priceIdr;
      const compareAtPriceIdr = override?.compareAtPriceIdr ?? t.compareAtPriceIdr;
      return {
        slug: t.slug,
        name,
        tagline: t.tagline,
        tags: t.tags,
        priceIdr,
        compareAtPriceIdr,
        discountPct: discountPercent(priceIdr, compareAtPriceIdr),
        priceFormatted: priceIdr === 0 ? "Gratis" : formatIdr(priceIdr),
        compareAtFormatted:
          compareAtPriceIdr && compareAtPriceIdr > priceIdr
            ? formatIdr(compareAtPriceIdr)
            : null,
        unlocked: canDownloadTemplate(access, t.slug),
      };
    });
  })();

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
