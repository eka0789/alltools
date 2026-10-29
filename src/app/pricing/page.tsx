import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Megaphone,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { getCatalog } from "@/lib/data";
import { LIFETIME_PRODUCT, TEAM_PRODUCT, TEMPLATE_PRODUCTS, formatIdr } from "@/lib/products";
import { dokuConfigured, dokuSimulationAllowed } from "@/lib/doku";
import { getSessionUser } from "@/lib/auth";
import { getUserAccess } from "@/lib/entitlements";
import { BuyButton } from "@/components/buy-button";

export const dynamic = "force-dynamic"; // harga & akses personal

export const metadata: Metadata = {
  title: "Pricing — Pro, Team & Template",
  description:
    "Direktori gratis selamanya. Beli template premium satuan, Pro Lifetime untuk akses semua, atau Paket Tim 10 seat. Pembayaran via DOKU (QRIS, VA, e-wallet).",
  alternates: { canonical: "/pricing" },
};

function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

export default async function PricingPage() {
  const { total } = getCatalog();
  const user = await getSessionUser();
  const access = await getUserAccess(user?.id ?? null);
  const dokuOn = dokuConfigured();
  const simMode = dokuSimulationAllowed();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent" />
          Pembayaran via DOKU — QRIS, Virtual Account, e-wallet & kartu
        </p>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
          Gratis untuk mencari. <span className="text-accent">Pro untuk build lebih cepat.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Pencarian {total.toLocaleString()} tools tetap gratis selamanya. Yang dijual:
          template premium, AI review tanpa batas, dan lisensi tim — sekali bayar,
          bukan langganan bulanan.
        </p>
      </header>

      {/* Plans */}
      <section className="mt-12">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card flex flex-col p-6">
            <p className="text-sm font-semibold">Free</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">Rp 0</span>
              <span className="text-xs text-muted-foreground">selamanya</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Semua fitur direktori + generator dasar.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Pencarian penuh, kategori, koleksi & glossary</Feature>
              <Feature>Generator boilerplate & deployment config</Feature>
              <Feature>Template gratis: unduh semua</Feature>
              <Feature>AI code review 3×/hari</Feature>
              <Feature>Public API & MCP fair use</Feature>
            </ul>
            <div className="mt-6 flex gap-2">
              <Link href="/templates" className="btn-secondary flex-1">
                Mulai gratis
              </Link>
            </div>
          </div>

          <div className="card relative flex flex-col border-accent/50 p-6">
            <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
              Paling populer
            </span>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Rocket className="h-4 w-4 text-accent" />
              Pro Lifetime
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{formatIdr(LIFETIME_PRODUCT.priceIdr)}</span>
              <span className="text-xs text-muted-foreground">sekali bayar</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Satu kali bayar — semua template premium + AI review tanpa batas, selamanya.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Semua template premium (sekarang & mendatang)</Feature>
              <Feature>AI code review tanpa batas harian</Feature>
              <Feature>Unduh ulang kapan pun</Feature>
              <Feature>Update template selamanya</Feature>
            </ul>
            <div className="mt-6">
              {access.hasLifetime ? (
                <span className="btn-primary block w-full cursor-default text-center opacity-70">
                  Anda sudah Pro ✓
                </span>
              ) : (
                <BuyButton
                  productId={LIFETIME_PRODUCT.id}
                  label={`Beli ${formatIdr(LIFETIME_PRODUCT.priceIdr)}`}
                  className="btn-primary w-full"
                />
              )}
            </div>
          </div>

          <div className="card flex flex-col p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-accent" />
              Paket Tim — 10 seat
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{formatIdr(TEAM_PRODUCT.priceIdr)}</span>
              <span className="text-xs text-muted-foreground">sekali bayar</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Untuk tim engineering & software house: 10 seat semua benefit Pro.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Pro untuk 10 anggota (owner + 9 invite)</Feature>
              <Feature>Invite via email — auto-join saat login</Feature>
              <Feature>AI review untuk seluruh anggota</Feature>
              <Feature>Lisensi komersial untuk proyek klien</Feature>
            </ul>
            <div className="mt-6">
              {access.teamIds.length > 0 ? (
                <span className="btn-primary block w-full cursor-default text-center opacity-70">
                  Tim aktif ✓
                </span>
              ) : (
                <BuyButton
                  productId={TEAM_PRODUCT.id}
                  label={`Beli ${formatIdr(TEAM_PRODUCT.priceIdr)}`}
                  className="btn-primary w-full"
                />
              )}
            </div>
          </div>
        </div>
        {!dokuOn && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {simMode
              ? "Mode pengembangan: pembayaran disimulasikan lokal (tanpa panggilan DOKU)."
              : "Gerbang pembayaran DOKU belum aktif di lingkungan ini — checkout dinonaktifkan sementara."}
          </p>
        )}
      </section>

      {/* Templates à la carte */}
      <section className="mt-14">
        <h2 className="text-lg font-semibold tracking-tight">Beli template satuan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tidak butuh semuanya? Beli satu template yang Anda perlukan. Pemilik Pro
          Lifetime mendapatkan semua template ini otomatis.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {TEMPLATE_PRODUCTS.map((p) => (
            <div key={p.id} className="card flex flex-col p-6">
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold">{formatIdr(p.priceIdr)}</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.slice(0, 4).map((f) => (
                  <Feature key={f}>{f}</Feature>
                ))}
              </ul>
              <div className="mt-5">
                {access.hasLifetime || access.templateIds.includes(p.id) ? (
                  <Link href={`/templates/${p.templateSlug}`} className="btn-secondary block w-full text-center">
                    Anda punya akses — buka
                  </Link>
                ) : (
                  <BuyButton productId={p.id} label={`Beli ${formatIdr(p.priceIdr)}`} className="btn-secondary w-full" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* For vendors — sponsored listings (tetap ada) */}
      <section className="mt-14">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Megaphone className="h-5 w-5 text-accent" />
          Untuk vendor tools — sponsored listings
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tampilkan produk Anda tepat saat developer membandingkan. Semua placement
          berbayar diberi label <strong>Sponsored</strong> dan tidak pernah mengubah
          penilaian editorial.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="card flex flex-col p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <BadgeCheck className="h-4 w-4 text-accent" />
              Verified Listing
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{formatIdr(299000)}</span>
              <span className="text-xs text-muted-foreground">sekali bayar</span>
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Editorial review 3 hari kerja</Feature>
              <Feature>Badge terverifikasi + profil diperkaya</Feature>
              <Feature>Logo, screenshot & install command</Feature>
            </ul>
            <div className="mt-6">
              <Link href="/submit" className="btn-secondary block w-full text-center">
                Submit tool Anda
              </Link>
            </div>
          </div>

          <div className="card relative flex flex-col border-accent/50 p-6">
            <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
              Tersedia
            </span>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" />
              Featured Placement
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{formatIdr(799000)}</span>
              <span className="text-xs text-muted-foreground">/tool /bulan</span>
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Slot Sponsored di kategori & pencarian</Feature>
              <Feature>Laporan bulanan: impressions, klik, CTR</Feature>
              <Feature>Jeda/batal kapan pun</Feature>
            </ul>
            <div className="mt-6">
              <Link href="/submit" className="btn-primary block w-full text-center">
                Klaim slot
                <ArrowRight className="inline h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="card flex flex-col p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Megaphone className="h-4 w-4 text-accent" />
              Category Sponsorship
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{formatIdr(2490000)}</span>
              <span className="text-xs text-muted-foreground">/bulan</span>
            </p>
            <ul className="mt-5 space-y-2.5">
              <Feature>Sponsor eksklusif satu kategori</Feature>
              <Feature>Logo + baris di digest mingguan</Feature>
              <Feature>Maks 1 sponsor per kategori</Feature>
            </ul>
            <div className="mt-6">
              <Link href="/submit" className="btn-secondary block w-full text-center">
                Hubungi kami
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 border-t border-border pt-8">
        <h2 className="text-base font-semibold">Pertanyaan umum pembayaran</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Metode pembayaran apa saja?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Melalui halaman pembayaran DOKU: QRIS (GoPay, OVO, Dana, ShopeePay),
              Virtual Account semua bank, kartu kredit/debit, dan gerai retail.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Apakah ini langganan?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tidak. Pro Lifetime dan Paket Tim adalah pembayaran sekali — tanpa
              perpanjangan otomatis, tanpa biaya tersembunyi.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Bagaimana lisensi penggunaan?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Template boleh dipakai untuk proyek pribadi dan klien tanpa batas.
              Tidak boleh dijual ulang sebagai template itu sendiri.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Refund?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Garansi 7 hari jika template tidak bisa diunduh atau tidak sesuai
              deskripsi. Hubungi kami dengan nomor invoice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
