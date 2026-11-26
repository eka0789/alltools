import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, inArray, isNull, like, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { entitlements, orders, users } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatDate } from "@/lib/slug";
import { formatIdr } from "@/lib/products";
import { grantProToUserAction, revokeUserEntitlementsAction } from "./actions";

export const dynamic = "force-dynamic";

interface UserRow {
  id: number;
  email: string;
  createdAt: number;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();

  let rows: UserRow[] = [];
  let ents: { userId: number; productId: string; teamId: number | null; createdAt: number }[] = [];
  let orderStats: { userId: number; n: number; revenue: number }[] = [];

  if (DB_ACTIVE) {
    try {
      const where = q ? like(users.email, `%${q.toLowerCase()}%`) : undefined;
      rows = await db
        .select({ id: users.id, email: users.email, createdAt: users.createdAt })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(100);

      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const [entRows, orderRows] = await Promise.all([
          db
            .select({
              userId: entitlements.userId,
              productId: entitlements.productId,
              teamId: entitlements.teamId,
              createdAt: entitlements.createdAt,
            })
            .from(entitlements)
            .where(and(inArray(entitlements.userId, ids), isNull(entitlements.revokedAt))),
          db
            .select({
              userId: orders.userId,
              n: sql<number>`count(*)`,
              revenue: sql<number>`coalesce(sum(case when ${orders.status} = 'paid' then ${orders.amount} else 0 end), 0)`,
            })
            .from(orders)
            .where(inArray(orders.userId, ids))
            .groupBy(orders.userId),
        ]);
        ents = entRows;
        orderStats = orderRows.map((o) => ({ userId: o.userId, n: Number(o.n), revenue: Number(o.revenue) }));
      }
    } catch {
      rows = [];
    }
  }

  const entByUser = new Map<number, typeof ents>();
  for (const e of ents) {
    const list = entByUser.get(e.userId) ?? [];
    list.push(e);
    entByUser.set(e.userId, list);
  }
  const statsByUser = new Map(orderStats.map((o) => [o.userId, o]));

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Support view: status akses, entitlement, dan riwayat order per pengguna.
          </p>
        </div>
        <a href="/admin/export?type=users" className="btn-secondary">Download CSV</a>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "granted" && "Pro granted."}
          {sp.ok === "revoked" && "Entitlement dicabut."}
        </p>
      )}
      {sp.error === "not_found" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          User tidak ditemukan.
        </p>
      )}

      <form className="mt-5 flex gap-2" action="/admin/users">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari email…"
          className="input max-w-sm"
        />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Bergabung</th>
              <th className="px-4 py-3">Akses</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada user.
                </td>
              </tr>
            ) : (
              rows.map((u) => {
                const list = entByUser.get(u.id) ?? [];
                const isPro = list.some((e) => e.productId === "pro_all" || e.teamId !== null);
                const stats = statsByUser.get(u.id);
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{u.email}</span>
                      <span className="block text-[10px] text-muted-foreground">#{u.id}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isPro ? "bg-accent-soft text-accent" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isPro ? "PRO" : "FREE"}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {list.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground">no active entitlement</span>
                        ) : (
                          list.map((e, i) => (
                            <span
                              key={`${e.productId}-${i}`}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono"
                            >
                              {e.productId}
                              {e.teamId ? ` · team#${e.teamId}` : ""}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {stats ? (
                        <>
                          <span className="font-medium">{formatIdr(stats.revenue)}</span>
                          <span className="block text-muted-foreground">{stats.n} order</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <form action={grantProToUserAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                            Grant Pro
                          </button>
                        </form>
                        {list.length > 0 && (
                          <form action={revokeUserEntitlementsAction}>
                            <input type="hidden" name="userId" value={u.id} />
                            <button type="submit" className="btn-secondary !px-2 !py-1 text-xs text-destructive">
                              Revoke all
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/teams" className="btn-secondary">Manage teams →</Link>
        <Link href="/admin/orders" className="btn-secondary">Orders →</Link>
      </div>
    </div>
  );
}
