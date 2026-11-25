"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tag, X } from "lucide-react";

const COUPON_ERRORS: Record<string, string> = {
  empty: "Masukkan kode promo terlebih dahulu.",
  "not-found": "Kode promo tidak ditemukan.",
  inactive: "Kode promo sudah tidak aktif.",
  expired: "Kode promo sudah kedaluwarsa.",
  "quota-exhausted": "Kuota kode promo sudah habis.",
  "min-amount": "Nominal belanja belum memenuhi syarat minimum kupon ini.",
  "rate-limited": "Terlalu banyak percobaan. Coba sebentar lagi.",
};

function formatIdrClient(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Tombol beli: POST /api/checkout → redirect ke halaman pembayaran DOKU,
// atau buka halaman checkout internal (mode simulasi). 401 → arahkan login.
export function BuyButton({
  productId,
  label = "Beli sekarang",
  className = "btn-primary",
  allowCoupon = true,
}: {
  productId: string;
  label?: string;
  className?: string;
  allowCoupon?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  async function checkCoupon() {
    const code = couponInput.trim();
    if (!code) {
      setCouponError(COUPON_ERRORS.empty);
      return;
    }
    setCouponChecking(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, productId }),
      });
      const data = (await res.json()) as {
        valid?: boolean;
        code?: string;
        discountAmount?: number;
        finalAmount?: number;
        error?: string;
      };
      if (data.valid && data.code && typeof data.finalAmount === "number") {
        setApplied({
          code: data.code,
          discountAmount: data.discountAmount ?? 0,
          finalAmount: data.finalAmount,
        });
        setCouponInput(data.code);
      } else {
        setApplied(null);
        setCouponError(COUPON_ERRORS[data.error ?? ""] ?? "Kode promo tidak valid.");
      }
    } catch {
      setCouponError("Gagal memeriksa kode promo.");
    } finally {
      setCouponChecking(false);
    }
  }

  async function buy() {
    setBusy(true);
    setError(null);
    setAlreadyOwned(false);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          couponCode: applied?.code ?? undefined,
        }),
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
      if (data.error?.startsWith("coupon-")) {
        const reason = data.error.replace("coupon-", "");
        setApplied(null);
        setCouponError(COUPON_ERRORS[reason] ?? "Kode promo tidak dapat dipakai.");
        setShowCoupon(true);
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

  return (
    <div className="flex flex-col gap-2">
      {allowCoupon && (
        <div>
          {!showCoupon && !applied ? (
            <button
              type="button"
              onClick={() => setShowCoupon(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
            >
              <Tag className="h-3 w-3" />
              Punya kode promo?
            </button>
          ) : applied ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/10 px-2.5 py-1.5 text-xs text-success">
              <span>
                Kupon <strong className="font-mono">{applied.code}</strong>: hemat{" "}
                {formatIdrClient(applied.discountAmount)} →{" "}
                <strong>{formatIdrClient(applied.finalAmount)}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setApplied(null);
                  setCouponInput("");
                }}
                aria-label="Hapus kupon"
                className="text-success/80 hover:text-success"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void checkCoupon();
                    }
                  }}
                  placeholder="Kode promo"
                  className="input !py-1.5 font-mono text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={() => void checkCoupon()}
                  disabled={couponChecking}
                  className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
                >
                  {couponChecking ? "…" : "Pakai"}
                </button>
              </div>
              {couponError && (
                <p className="text-[11px] text-red-600 dark:text-red-400">{couponError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <button type="button" onClick={buy} disabled={busy} className={className}>
        {busy
          ? "Memproses…"
          : applied
            ? `${label} (${formatIdrClient(applied.finalAmount)})`
            : label}
      </button>
    </div>
  );
}
