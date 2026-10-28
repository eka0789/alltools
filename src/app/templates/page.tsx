import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Unlock } from "lucide-react";
import { TEMPLATES } from "@/data/templates";
import { formatIdr } from "@/lib/products";
import { getSessionUser } from "@/lib/auth";
import { canDownloadTemplate, getUserAccess } from "@/lib/entitlements";

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
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const unlocked = canDownloadTemplate(access, t.slug);
          return (
            <Link
              key={t.slug}
              href={`/templates/${t.slug}`}
              className="card flex flex-col p-6 transition-colors hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t.name}</h2>
                {t.priceIdr === 0 ? (
                  <Unlock className="h-4 w-4 text-success" aria-label="Gratis" />
                ) : unlocked ? (
                  <Unlock className="h-4 w-4 text-accent" aria-label="Anda punya akses" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" aria-label="Premium" />
                )}
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{t.tagline}</p>
              <div className="mt-3 flex items-center gap-1.5">
                {t.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold">
                {t.priceIdr === 0 ? "Gratis" : formatIdr(t.priceIdr)}
              </p>
            </Link>
          );
        })}
      </div>
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
