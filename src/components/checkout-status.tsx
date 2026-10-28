"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ExternalLink } from "lucide-react";

// Status order di-poll tiap 3 detik sampai paid. Di mode simulasi (dev)
// tersedia tombol untuk mengemulasi pembayaran sukses.
export function CheckoutStatus({
  invoice,
  paymentUrl,
  simulated,
}: {
  invoice: string;
  paymentUrl: string | null;
  simulated: boolean;
}) {
  const [status, setStatus] = useState<"pending" | "paid" | "error">("pending");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "paid" || status === "error") return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(invoice)}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          router.push(`/login?next=/checkout/${invoice}`);
          return;
        }
        const data = (await res.json()) as { status?: string };
        if (alive && data.status === "paid") setStatus("paid");
        if (!res.ok && alive && res.status !== 404) setStatus("error");
      } catch {
        // biarkan polling lanjut
      }
    };
    void tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [invoice, status, router]);

  async function simulate() {
    setBusy(true);
    try {
      await fetch(`/api/checkout?invoice=${encodeURIComponent(invoice)}`, { method: "PUT" });
      setStatus("pending"); // biarkan poll menangkap perubahan
    } finally {
      setBusy(false);
    }
  }

  if (status === "paid") {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h2 className="mt-3 text-lg font-semibold">Pembayaran diterima!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entitlement Anda sudah aktif. Invoice <code className="font-mono">{invoice}</code>.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/account" className="btn-primary">
            Buka akun & unduh
          </Link>
          <Link href="/templates" className="btn-secondary">
            Lihat template
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8 text-center">
      <Clock className="mx-auto h-10 w-10 animate-pulse text-accent" />
      <h2 className="mt-3 text-lg font-semibold">Menunggu pembayaran…</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Halaman ini otomatis ter-update setelah pembayaran terkonfirmasi. Invoice{" "}
        <code className="font-mono">{invoice}</code>.
      </p>
      {paymentUrl && paymentUrl.startsWith("http") && (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary mt-5 inline-flex items-center gap-2"
        >
          Buka halaman pembayaran DOKU
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {simulated && (
        <div className="mt-5">
          <button type="button" onClick={simulate} disabled={busy} className="btn-secondary">
            {busy ? "Memproses…" : "Bayar (simulasi dev)"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Tanpa kredensial DOKU di lingkungan non-produksi, tombol ini mengemulasi
            webhook pembayaran untuk menguji alur end-to-end.
          </p>
        </div>
      )}
      {status === "error" && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          Gagal memuat status. Muat ulang halaman.
        </p>
      )}
    </div>
  );
}
