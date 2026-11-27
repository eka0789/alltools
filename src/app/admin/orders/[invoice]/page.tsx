import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { orders, users } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatIdr, getProduct } from "@/lib/products";
import { ORDER_EVENT_LABEL, getOrderEvents } from "@/lib/order-events";
import { markOrderPaidAction, partialRefundAction, resendReceiptAction, voidOrderAction } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  paid: "Lunas",
  pending: "Menunggu pembayaran",
  expired: "Kedaluwarsa",
  failed: "Gagal / dibatalkan",
  refunded: "Refund",
};

function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyJson(raw: string | null): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function statusClass(status: string): string {
  if (status === "paid") return "text-success";
  if (status === "pending") return "text-warning";
  return "text-muted-foreground";
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoice: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");

  const { invoice } = await params;
  const sp = await searchParams;

  let row:
    | {
        id: number;
        invoiceNo: string;
        productId: string;
        amount: number;
        discountAmount: number;
        couponCode: string | null;
        status: string;
        provider: string;
        paymentUrl: string | null;
        providerPayload: string | null;
        createdAt: number;
        updatedAt: number;
        paidAt: number | null;
        refundedAmount: number;
        refundReason: string | null;
        email: string;
        userId: number;
      }
    | null = null;

  if (DB_ACTIVE) {
    try {
      row =
        (
          await db
            .select({
              id: orders.id,
              invoiceNo: orders.invoiceNo,
              productId: orders.productId,
              amount: orders.amount,
              discountAmount: orders.discountAmount,
              couponCode: orders.couponCode,
              status: orders.status,
              provider: orders.provider,
              paymentUrl: orders.paymentUrl,
              providerPayload: orders.providerPayload,
              createdAt: orders.createdAt,
              updatedAt: orders.updatedAt,
              paidAt: orders.paidAt,
              refundedAmount: orders.refundedAmount,
              refundReason: orders.refundReason,
              email: users.email,
              userId: users.id,
            })
            .from(orders)
            .innerJoin(users, eq(users.id, orders.userId))
            .where(eq(orders.invoiceNo, invoice))
            .limit(1)
        )[0] ?? null;
    } catch {
      row = null;
    }
  }

  if (!row) notFound();

  const product = getProduct(row.productId);
  const subtotal = row.amount + (row.discountAmount ?? 0);
  const netPaid = row.amount - row.refundedAmount;
  const payload = prettyJson(row.providerPayload);

  const events = await getOrderEvents(row.id);
  const timeline: {
    label: string;
    detail?: string;
    at: number;
    tone: "neutral" | "success" | "warning";
  }[] =
    events.length > 0
      ? events.map((event) => ({
          label: ORDER_EVENT_LABEL[event.type] ?? event.type,
          detail: event.detail,
          at: event.createdAt,
          tone:
            event.type === "paid"
              ? "success"
              : event.type.includes("refund") ||
                  event.type === "failed" ||
                  event.type === "expired"
                ? "warning"
                : "neutral",
        }))
      : [
          { label: "Order dibuat", at: row.createdAt, tone: "neutral" },
          ...(row.paidAt
            ? [
                {
                  label: "Pembayaran diterima — entitlement aktif",
                  at: row.paidAt,
                  tone: "success" as const,
                },
              ]
            : []),
          ...(row.status !== "pending" && row.status !== "paid"
            ? [
                {
                  label: `Status akhir: ${STATUS_LABEL[row.status] ?? row.status}`,
                  at: row.updatedAt,
                  tone: "warning" as const,
                },
              ]
            : []),
        ];

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Orders
          </Link>
          <h1 className="mt-2 font-mono text-2xl font-bold tracking-tight">{row.invoiceNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product?.name ?? row.productId} · {row.email} ·{" "}
            <span className={`font-semibold ${statusClass(row.status)}`}>
              {STATUS_LABEL[row.status] ?? row.status}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {row.status === "pending" && (
            <>
              <form action={markOrderPaidAction}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="btn-primary text-xs">Mark paid</button>
              </form>
              <form action={voidOrderAction}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="btn-secondary text-xs">Cancel</button>
              </form>
            </>
          )}
          {row.status === "paid" && (
            <>
              <form action={resendReceiptAction}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="btn-secondary text-xs">Resend receipt</button>
              </form>
              <form action={voidOrderAction}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="btn-secondary text-xs text-destructive">Refund</button>
              </form>
            </>
          )}
          {row.paymentUrl && (
            <a href={row.paymentUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1 text-xs">
              Payment page <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {sp.ok === "refunded" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Refund dicatat. Entitlement dicabut hanya bila refund penuh.
        </p>
      )}
      {sp.error === "refund_amount" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Jumlah refund tidak valid (harus &gt; 0 dan ≤ sisa yang bisa direfund).
        </p>
      )}
      {sp.error === "not_paid" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Refund hanya untuk order lunas.
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Detail order</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Invoice" value={<span className="font-mono">{row.invoiceNo}</span>} />
            <Row label="Produk" value={product?.name ?? row.productId} />
            <Row label="Provider" value={row.provider} />
            <Row label="Dibuat" value={fmtDateTime(row.createdAt)} />
            <Row label="Diperbarui" value={fmtDateTime(row.updatedAt)} />
            <Row label="Dibayar" value={fmtDateTime(row.paidAt)} />
            <Row
              label="Customer"
              value={
                <Link href={`/admin/users?q=${encodeURIComponent(row.email)}`} className="text-accent hover:underline">
                  {row.email}
                </Link>
              }
            />
            <Row
              label="Invoice pelanggan"
              value={
                <Link href={`/account/invoice/${row.invoiceNo}`} className="text-accent hover:underline">
                  /account/invoice/{row.invoiceNo}
                </Link>
              }
            />
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Rincian pembayaran</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Subtotal" value={formatIdr(subtotal)} />
            <Row
              label="Diskon"
              value={
                row.discountAmount > 0
                  ? `− ${formatIdr(row.discountAmount)}${row.couponCode ? ` (${row.couponCode})` : ""}`
                  : "—"
              }
            />
            <Row label="Total dibayar" value={<span className="font-semibold">{formatIdr(row.amount)}</span>} />
            {row.refundedAmount > 0 && (
              <>
                <Row label="Refund" value={`− ${formatIdr(row.refundedAmount)}`} />
                <Row
                  label="Net diterima"
                  value={<span className="font-semibold">{formatIdr(netPaid)}</span>}
                />
              </>
            )}
            {row.refundReason && <Row label="Alasan refund" value={row.refundReason} />}
            <Row label="Kupon" value={row.couponCode ?? "—"} />
            {row.couponCode && (
              <Row
                label="Order dengan kupon ini"
                value={
                  <Link href={`/admin/orders?coupon=${encodeURIComponent(row.couponCode)}`} className="text-accent hover:underline">
                    Lihat semua →
                  </Link>
                }
              />
            )}
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Timeline memakai timestamp yang tersimpan (dibuat/dibayar/diperbarui). Event-level
            history (webhook per percobaan) belum dicatat terpisah.
          </p>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="font-semibold">Timeline status</h2>
        <ol className="mt-3 space-y-3">
          {timeline.map((event, index) => (
            <li key={`${event.at}-${index}`} className="flex gap-3">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  event.tone === "success"
                    ? "bg-success"
                    : event.tone === "warning"
                      ? "bg-warning"
                      : "bg-muted-foreground"
                }`}
              />
              <span>
                <span className="block text-sm">{event.label}</span>
                {event.detail && (
                  <span className="block text-[11px] text-muted-foreground">{event.detail}</span>
                )}
                <span className="block text-[11px] text-muted-foreground">{fmtDateTime(event.at)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {(row.status === "paid" || row.status === "refunded") && netPaid > 0 && (
        <div className="card mt-4 p-5">
          <h2 className="font-semibold">Refund sebagian</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sisa yang bisa direfund: {formatIdr(netPaid)}. Refund penuh otomatis mencabut entitlement.
          </p>
          <form action={partialRefundAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={row.id} />
            <input
              name="amount"
              type="number"
              min={1}
              max={netPaid}
              required
              placeholder="Jumlah IDR"
              className="input !w-40 text-sm"
            />
            <input
              name="reason"
              placeholder="Alasan refund"
              className="input min-w-[200px] flex-1 text-sm"
            />
            <button type="submit" className="btn-secondary text-xs">Refund</button>
          </form>
        </div>
      )}

      <details className="card mt-4 p-5">
        <summary className="cursor-pointer font-semibold">
          Payload provider {payload ? "" : "(kosong)"}
        </summary>
        {payload ? (
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
            {payload}
          </pre>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Belum ada payload — order belum menerima webhook/status DOKU.
          </p>
        )}
      </details>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
