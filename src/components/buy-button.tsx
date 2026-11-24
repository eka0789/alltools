"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Tombol beli: POST /api/checkout → redirect ke halaman pembayaran DOKU,
// atau buka halaman checkout internal (mode simulasi). 401 → arahkan login.
export function BuyButton({
  productId,
  label = "Beli sekarang",
  className = "btn-primary",
}: {
  productId: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function buy() {
    setBusy(true);
    setError(null);
    setAlreadyOwned(false);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        const next = pathname && pathname.startsWith("/") ? pathname : "/pricing";
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        paymentUrl?: string;
        invoice?: string;
        error?: string;
      };
      if (res.status === 409 && data.error === "already-owned") {
        setAlreadyOwned(true);
        return;
      }
      if (data.ok && data.invoice) {
        const target = data.paymentUrl ?? `/checkout/${data.invoice}`;
        if (target.startsWith("http")) {
          window.location.href = target;
        } else {
          router.push(target);
        }
        return;
      }
      setError(
        data.error === "payment-not-configured"
          ? "Pembayaran belum dikonfigurasi. Hubungi admin."
          : data.error
            ? `Gagal membuat pesanan (${data.error}). Coba lagi.`
            : "Gagal membuat pesanan. Coba lagi.",
      );
    } catch {
      setError("Gagal terhubung. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (alreadyOwned) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-success">Anda sudah memiliki akses untuk produk ini.</p>
        <Link href="/account" className="btn-secondary text-center">
          Buka Akun Saya
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        <button type="button" onClick={buy} disabled={busy} className="btn-secondary">
          {busy ? "Memproses…" : "Coba lagi"}
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={buy} disabled={busy} className={className}>
      {busy ? "Memproses…" : label}
    </button>
  );
}
