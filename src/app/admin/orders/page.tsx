import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, RotateCw } from "lucide-react";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { orders, users } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatIdr, getProduct, PRODUCTS } from "@/lib/products";
import { formatDate } from "@/lib/slug";
import { reconcileOrdersAction } from "../actions";
import { markOrderPaidAction, resendReceiptAction, voidOrderAction } from "./actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

const STATUS_LABEL: Record<string, string> = {
  paid: "Lunas",
  pending: "Menunggu",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  refunded: "Refund",
};

function statusClass(status: string): string {
  if (status === "paid") return "text-success";
  if (status === "pending") return "text-warning";
  return "text-muted-foreground";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const status = String(sp.status ?? "");
  const product = String(sp.product ?? "");
  const coupon = String(sp.coupon ?? "").trim();
  const q = String(sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  let rows: {
    id: number;
    invoiceNo: string;
    productId: string;
    amount: number;
    discountAmount: number;
    couponCode: string | null;
    status: string;
    provider: string;
    paymentUrl: string | null;
    createdAt: number;
    paidAt: number | null;
    email: string;
  }[] = [];
  let total = 0;
  let statusSummary: { status: string; n: number; sum: number }[] = [];

  if (DB_ACTIVE) {
    const conditions = [];
    if (status) conditions.push(eq(orders.status, status));
    if (product) conditions.push(eq(orders.productId, product));
    if (coupon) conditions.push(eq(orders.couponCode, coupon.toUpperCase()));
    if (q) {
      conditions.push(
        or(
          like(orders.invoiceNo, `%${q.toUpperCase()}%`),
          like(users.email, `%${q.toLowerCase()}%`),
        ),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    try {
      const [list, countRows, summary] = await Promise.all([
        db
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
            createdAt: orders.createdAt,
            paidAt: orders.paidAt,
            email: users.email,
          })
          .from(orders)
          .innerJoin(users, eq(users.id, orders.userId))
          .where(where)
          .orderBy(desc(orders.createdAt))
          .limit(PER_PAGE)
          .offset((page - 1) * PER_PAGE),
        db
          .select({ n: sql<number>`count(*)` })
          .from(orders)
          .innerJoin(users, eq(users.id, orders.userId))
          .where(where),
        db
          .select({
            status: orders.status,
            n: sql<number>`count(*)`,
            sum: sql<number>`coalesce(sum(${orders.amount} - ${orders.refundedAmount}), 0)`,
          })
          .from(orders)
          .groupBy(orders.status),
      ]);
      rows = list;
      total = Number(countRows[0]?.n ?? 0);
      statusSummary = summary.map((s) => ({ status: s.status, n: Number(s.n), sum: Number(s.sum) }));
    } catch {
      rows = [];
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const paid = statusSummary.find((s) => s.status === "paid");
  const pending = statusSummary.find((s) => s.status === "pending");

  const queryBase = new URLSearchParams();
  if (status) queryBase.set("status", status);
  if (product) queryBase.set("product", product);
  if (coupon) queryBase.set("coupon", coupon);
  if (q) queryBase.set("q", q);

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semua transaksi DOKU/manual. Mark-paid dan refund mencabut/memberi entitlement
            secara otomatis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/admin/export?type=orders" className="btn-secondary">
            <Download className="h-4 w-4" /> CSV
          </a>
          <form action={reconcileOrdersAction}>
            <button type="submit" className="btn-primary">
              <RotateCw className="h-4 w-4" /> Reconcile DOKU
            </button>
          </form>
        </div>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "paid" && "Order ditandai lunas — entitlement aktif dan receipt dikirim."}
          {sp.ok === "refunded" && "Order direfund — entitlement pengguna dicabut."}
          {sp.ok === "voided" && "Order pending dibatalkan."}
          {sp.ok === "receipt" && "Email receipt dikirim ulang."}
        </p>
      )}
      {typeof sp.error === "string" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {sp.error === "not_found" && "Order tidak ditemukan."}
          {sp.error === "not_pending" && "Order bukan berstatus pending."}
          {sp.error === "already_paid" && "Order sudah lunas."}
          {sp.error === "not_paid" && "Hanya order lunas yang bisa dikirimi receipt."}
          {sp.error === "receipt_failed" && "Email gagal dikirim — periksa RESEND_API_KEY."}
          {sp.error === "forbidden" && "Role Anda tidak boleh mengelola billing."}
        </p>
      )}

      {coupon && (
        <p className="mt-4 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
          Filter kupon <code className="font-mono">{coupon.toUpperCase()}</code> ·{" "}
          <Link href="/admin/orders" className="underline">
            hapus filter
          </Link>
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Revenue (net)</p>
          <p className="mt-1 text-2xl font-bold text-success">{formatIdr(paid?.sum ?? 0)}</p>
          <p className="text-xs text-muted-foreground">{paid?.n ?? 0} order · net of refunds</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending</p>
          <p className={`mt-1 text-2xl font-bold ${(pending?.n ?? 0) > 0 ? "text-warning" : ""}`}>
            {pending?.n ?? 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">All orders</p>
          <p className="mt-1 text-2xl font-bold">{statusSummary.reduce((a, s) => a + s.n, 0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Refunded</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">
            {statusSummary.find((s) => s.status === "refunded")?.n ?? 0}
          </p>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-2" action="/admin/orders">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari invoice / email…"
          className="input max-w-xs"
        />
        <input
          name="coupon"
          defaultValue={coupon}
          placeholder="Kupon (opsional)"
          className="input max-w-[160px] font-mono text-xs uppercase"
        />
        <select name="status" defaultValue={status} className="input !w-auto text-sm">
          <option value="">Semua status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="product" defaultValue={product} className="input !w-auto text-sm">
          <option value="">Semua produk</option>
          {PRODUCTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Filter</button>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Produk</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada order untuk filter ini.
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <Link href={`/admin/orders/${o.invoiceNo}`} className="text-accent hover:underline">
                      {o.invoiceNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{getProduct(o.productId)?.name ?? o.productId}</span>
                    {o.couponCode && (
                      <span className="block text-[10px] text-muted-foreground">
                        kupon {o.couponCode} (−{formatIdr(o.discountAmount)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.email}</td>
                  <td className="px-4 py-2.5 font-medium">{formatIdr(o.amount)}</td>
                  <td className={`px-4 py-2.5 text-xs font-semibold ${statusClass(o.status)}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/orders/${o.invoiceNo}`}
                        className="btn-secondary !px-2 !py-1 text-xs"
                      >
                        Detail
                      </Link>
                      {o.status === "pending" && (
                        <>
                          <form action={markOrderPaidAction}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="btn-primary !px-2 !py-1 text-xs">
                              Mark paid
                            </button>
                          </form>
                          <form action={voidOrderAction}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                              Cancel
                            </button>
                          </form>
                        </>
                      )}
                      {o.status === "paid" && (
                        <>
                          <form action={resendReceiptAction}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                              Receipt
                            </button>
                          </form>
                          <form action={voidOrderAction}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" className="btn-secondary !px-2 !py-1 text-xs text-destructive">
                              Refund
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/admin/orders?${queryBase.toString()}&page=${page - 1}`}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/orders?${queryBase.toString()}&page=${page + 1}`}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
