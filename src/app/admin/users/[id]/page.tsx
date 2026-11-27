import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import {
  aiUsage,
  entitlements,
  orders,
  sessions,
  teamMembers,
  teams,
  users,
} from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatIdr } from "@/lib/products";
import { formatDate } from "@/lib/slug";
import { ConfirmDeleteButton } from "../../tools/confirm-delete-button";
import { deleteUserAction } from "../actions";

export const dynamic = "force-dynamic";

const ORDER_STATUS: Record<string, string> = {
  paid: "Lunas",
  pending: "Menunggu",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  refunded: "Refund",
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");

  const id = Number((await params).id);
  if (!Number.isFinite(id) || id <= 0) notFound();

  let user: typeof users.$inferSelect | null = null;
  let orderRows: (typeof orders.$inferSelect)[] = [];
  let entitlementRows: (typeof entitlements.$inferSelect)[] = [];
  let membershipRows: { teamId: number; name: string; seats: number; role: string }[] = [];
  let aiCount = 0;
  let sessionCount = 0;
  let paidTotal = 0;

  if (DB_ACTIVE) {
    try {
      user = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0] ?? null;
      if (user) {
        const [orderList, entList, teamList, aiRows, sessionRows] = await Promise.all([
          db.select().from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)),
          db
            .select()
            .from(entitlements)
            .where(eq(entitlements.userId, id))
            .orderBy(desc(entitlements.createdAt)),
          db
            .select({
              teamId: teams.id,
              name: teams.name,
              seats: teams.seats,
              role: teamMembers.role,
            })
            .from(teamMembers)
            .innerJoin(teams, eq(teams.id, teamMembers.teamId))
            .where(eq(teamMembers.userId, id)),
          db
            .select({ n: sql<number>`count(*)` })
            .from(aiUsage)
            .where(eq(aiUsage.userId, id)),
          db
            .select({ n: sql<number>`count(*)` })
            .from(sessions)
            .where(eq(sessions.userId, id)),
        ]);
        orderRows = orderList;
        entitlementRows = entList;
        membershipRows = teamList;
        aiCount = Number(aiRows[0]?.n ?? 0);
        sessionCount = Number(sessionRows[0]?.n ?? 0);
        paidTotal = orderRows
          .filter((o) => o.status === "paid")
          .reduce((sum, o) => sum + o.amount - o.refundedAmount, 0);
      }
    } catch {
      user = null;
    }
  }

  if (!user) notFound();

  const activeEntitlements = entitlementRows.filter((e) => !e.revokedAt);
  const isPro = activeEntitlements.some((e) => e.productId === "pro_all" || e.teamId !== null);

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-foreground">
            ← Users
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{user.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            #{user.id} · bergabung {formatDate(user.createdAt)} ·{" "}
            <span className={isPro ? "font-semibold text-accent" : ""}>{isPro ? "PRO" : "FREE"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/admin/export?type=user&id=${user.id}`} className="btn-secondary text-xs">
            Export data (JSON)
          </a>
          <form action={deleteUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <ConfirmDeleteButton name={user.email} permanent />
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Net revenue</p>
          <p className="mt-1 text-2xl font-bold">{formatIdr(paidTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Orders</p>
          <p className="mt-1 text-2xl font-bold">{orderRows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">AI reviews</p>
          <p className="mt-1 text-2xl font-bold">{aiCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Sessions aktif</p>
          <p className="mt-1 text-2xl font-bold">{sessionCount}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Entitlement</h2>
          {entitlementRows.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Tidak ada entitlement.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {entitlementRows.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{e.productId}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.teamId ? `team#${e.teamId} · ` : ""}
                    {e.revokedAt ? "dicabut" : "aktif"} · {formatDate(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Tim</h2>
          {membershipRows.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Bukan anggota tim.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {membershipRows.map((t) => (
                <li key={t.teamId} className="flex items-center justify-between gap-2">
                  <Link href="/admin/teams" className="text-accent hover:underline">
                    {t.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {t.role} · {t.seats} seat
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <div className="px-4 pt-4">
          <h2 className="font-semibold">Riwayat order</h2>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Produk</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Refund</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {orderRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Belum ada order.
                </td>
              </tr>
            ) : (
              orderRows.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link href={`/admin/orders/${o.invoiceNo}`} className="text-accent hover:underline">
                      {o.invoiceNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs">{o.productId}</td>
                  <td className="px-4 py-2 text-xs">{formatIdr(o.amount)}</td>
                  <td className="px-4 py-2 text-xs">
                    {o.refundedAmount > 0 ? formatIdr(o.refundedAmount) : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">{ORDER_STATUS[o.status] ?? o.status}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-warning">
        Menghapus user berlaku permanen: session, order, entitlement, keanggotaan tim, dan
        pemakaian AI ikut terhapus (cascade). Gunakan Export JSON untuk arsip sebelum hapus.
      </p>
    </div>
  );
}
