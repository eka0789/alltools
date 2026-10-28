import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { TEMPLATES, getTemplate } from "@/data/templates";
import { formatIdr } from "@/lib/products";
import { getSessionUser } from "@/lib/auth";
import { canDownloadTemplate, getUserAccess } from "@/lib/entitlements";
import { BuyButton } from "@/components/buy-button";
import { TemplateDownloadButton } from "./download-button";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTemplate(slug);
  if (!t) return {};
  return {
    title: `${t.name} — Template Proyek`,
    description: t.tagline,
    alternates: { canonical: `/templates/${t.slug}` },
  };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  const user = await getSessionUser();
  const access = await getUserAccess(user?.id ?? null);
  const unlocked = canDownloadTemplate(access, template.slug);
  const related = TEMPLATES.filter((t) => t.slug !== template.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav className="text-xs text-muted-foreground">
        <Link href="/templates" className="hover:text-foreground">
          ← Semua template
        </Link>
      </nav>
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              template.priceIdr === 0 ? "bg-success/10 text-success" : "bg-accent-soft text-accent"
            }`}
          >
            {template.priceIdr === 0 ? "Gratis" : formatIdr(template.priceIdr)}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <section>
            <h2 className="text-base font-semibold">Yang Anda dapatkan</h2>
            <ul className="mt-3 space-y-2">
              {template.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span className="text-muted-foreground">{h}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="mt-8">
            <h2 className="text-base font-semibold">Spesifikasi teknis</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ["Stack", template.preset.stack],
                ["Database", template.preset.database],
                ["Auth", template.preset.auth],
                ["Docker", template.preset.docker ? "termasuk" : "tidak"],
                ["Tests", template.preset.tests ? "termasuk" : "tidak"],
                ["Bahasa", template.preset.stack === "fastapi" ? "Python" : "TypeScript"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 font-medium capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="mt-8">
            <h2 className="text-base font-semibold">Tags</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>

        <aside className="card h-fit p-6">
          <p className="text-sm font-semibold">
            {template.priceIdr === 0 ? "Gratis" : formatIdr(template.priceIdr)}
            {template.priceIdr > 0 && <span className="ml-1 text-xs text-muted-foreground">sekali bayar</span>}
          </p>
          <div className="mt-4">
            {template.priceIdr === 0 || unlocked ? (
              <TemplateDownloadButton slug={template.slug} />
            ) : (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Template premium — butuh pembelian
                </p>
                <BuyButton
                  productId={`tpl:${template.slug}`}
                  label={`Beli ${formatIdr(template.priceIdr)}`}
                  className="btn-primary w-full"
                />
                <Link href="/pricing" className="btn-secondary block w-full text-center text-xs">
                  atau dapatkan semua via Pro Lifetime
                </Link>
              </div>
            )}
          </div>
          <ul className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <li>✓ Lisensi proyek pribadi & komersial</li>
            <li>✓ Unduh ulang kapan pun dari halaman akun</li>
            <li>✓ Garansi 7 hari</li>
          </ul>
        </aside>
      </div>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-base font-semibold">Template lain</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {related.map((t) => (
            <Link key={t.slug} href={`/templates/${t.slug}`} className="card p-4 transition-colors hover:border-accent/40">
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.tagline}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
