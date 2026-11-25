import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { formatIdr, getProduct } from "@/lib/products";
import { PrintInvoiceButton } from "./print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice Pembelian",
  robots: { index: false },
};

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ invoice: string }>;
}) {
  const { invoice } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/account/invoice/${invoice}`)}`);

  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.invoiceNo, invoice), eq(orders.userId, user.id)))
    .limit(1);
  const order = rows[0];
  if (!order) notFound();

  const product = getProduct(order.productId);
  const subtotal = order.amount + (order.discountAmount ?? 0);
  const issuedDate = new Date(order.paidAt ?? order.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Akun
        </Link>
        <PrintInvoiceButton />
      </div>

      <article className="card p-8 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-lg font-bold tracking-tight">AktifKoding</p>
            <p className="text-xs text-muted-foreground">Developer Tools Pro · aktifkoding.biz.id</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invoice / Kuitansi
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold">{order.invoiceNo}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tanggal: {issuedDate}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ditagihkan kepada
            </p>
            <p className="mt-1 font-medium">{user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status Pembayaran
            </p>
            <p
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                order.status === "paid"
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning"
              }`}
            >
              {order.status === "paid" && <CheckCircle2 className="h-3.5 w-3.5" />}
              {order.status === "paid" ? "LUNAS" : order.status.toUpperCase()}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2">Deskripsi</th>
              <th className="py-2 text-right">Harga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr>
              <td className="py-3.5">
                <p className="font-medium">{product?.name ?? order.productId}</p>
                {product?.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{product.description}</p>
                )}
              </td>
              <td className="py-3.5 text-right font-mono">{formatIdr(subtotal)}</td>
            </tr>
            {order.couponCode && order.discountAmount > 0 && (
              <tr>
                <td className="py-3 text-xs text-muted-foreground">
                  Diskon Kupon (<code className="font-mono">{order.couponCode}</code>)
                </td>
                <td className="py-3 text-right font-mono text-xs text-success">
                  -{formatIdr(order.discountAmount)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="pt-4 font-semibold">Total Dibayar</td>
              <td className="pt-4 text-right font-mono text-base font-bold">
                {formatIdr(order.amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>Metode pembayaran: {order.provider === "doku" ? "DOKU Checkout" : "Simulasi / Manual"}.</p>
          <p className="mt-1">
            Dokumen ini dibuat secara otomatis oleh sistem AktifKoding dan sah sebagai bukti
            pembayaran digital.
          </p>
        </div>
      </article>
    </div>
  );
}
