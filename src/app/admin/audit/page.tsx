import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, like, or, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { adminAudit } from "@/db/schema";
import { ensureOpsSchema, getAdminIdentity, roleCan } from "@/lib/admin";
import { formatDate } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = 100;

  let rows: {
    id: number;
    actor: string;
    action: string;
    target: string;
    detail: string;
    createdAt: number;
  }[] = [];
  let total = 0;

  if (DB_ACTIVE) {
    try {
      await ensureOpsSchema();
      const where = q
        ? and(
            or(
              like(adminAudit.actor, `%${q}%`),
              like(adminAudit.action, `%${q}%`),
              like(adminAudit.target, `%${q}%`),
              like(adminAudit.detail, `%${q}%`),
            ),
          )
        : undefined;
      const [list, countRows] = await Promise.all([
        db
          .select()
          .from(adminAudit)
          .where(where)
          .orderBy(desc(adminAudit.createdAt))
          .limit(perPage)
          .offset((page - 1) * perPage),
        db
          .select({ n: sql<number>`count(*)` })
          .from(adminAudit)
          .where(where),
      ]);
      rows = list;
      total = Number(countRows[0]?.n ?? 0);
    } catch {
      rows = [];
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jejak aksi admin: siapa, kapan, dan apa. {total.toLocaleString()} entri.
          </p>
        </div>
        <a href="/admin/export?type=audit" className="btn-secondary">Download CSV</a>
      </div>

      <form className="mt-5 flex gap-2" action="/admin/audit">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari actor / aksi / target…"
          className="input max-w-sm"
        />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada aktivitas tercatat.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                    {formatDate(row.createdAt)}
                    <span className="block">
                      {new Date(row.createdAt).toLocaleTimeString("en-GB")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono">{row.actor}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">{row.action}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.target}</td>
                  <td className="px-4 py-2.5 text-xs">{row.detail}</td>
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
              href={`/admin/audit?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-xs text-muted-foreground">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/audit?q=${encodeURIComponent(q)}&page=${page + 1}`}
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
