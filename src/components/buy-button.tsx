"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        paymentUrl?: string;
        invoice?: string;
        error?: string;
      };
      if (data.ok && data.invoice) {
        router.push(data.paymentUrl ?? `/checkout/${data.invoice}`);
        return;
      }
      setError(
        data.error === "payment-not-configured"
          ? "Pembayaran belum dikonfigurasi. Hubungi admin."
          : "Gagal membuat pesanan. Coba lagi.",
      );
    } catch {
      setError("Gagal terhubung. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        <Link href="/login" className="btn-secondary">
          Coba lagi
        </Link>
      </div>
    );
  }

  return (
    <button type="button" onClick={buy} disabled={busy} className={className}>
      {busy ? "Memproses…" : label}
    </button>
  );
}
