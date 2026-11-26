import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, isNotNull, isNull, like, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { subscribers, type Subscriber } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatDate } from "@/lib/slug";
import {
  deleteSubscriberAction,
  resendConfirmationAction,
  sendDigestNowAction,
  unsubscribeSubscriberAction,
} from "./actions";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "Semua" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pending", label: "Pending" },
  { key: "unsubscribed", label: "Unsubscribed" },
];

function statusOf(s: Subscriber): "confirmed" | "pending" | "unsubscribed" {
  if (s.unsubscribedAt) return "unsubscribed";
  if (s.confirmedAt) return "confirmed";
  return "pending";
}

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const status = String(sp.status ?? "all");
  const q = String(sp.q ?? "").trim();

  let rows: Subscriber[] = [];
  let counts = { total: 0, confirmed: 0, pending: 0, unsubscribed: 0 };

  if (DB_ACTIVE) {
    try {
      const conditions = [];
      if (status === "confirmed") {
        conditions.push(and(isNotNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt)));
      } else if (status === "pending") {
        conditions.push(and(isNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt)));
      } else if (status === "unsubscribed") {
        conditions.push(isNotNull(subscribers.unsubscribedAt));
      }
      if (q) conditions.push(like(subscribers.email, `%${q.toLowerCase()}%`));

      const [list, totalRow, confirmedRow, pendingRow, unsubRow] = await Promise.all([
        db
          .select()
          .from(subscribers)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(subscribers.createdAt))
          .limit(200),
        db.select({ n: sql<number>`count(*)` }).from(subscribers),
        db
          .select({ n: sql<number>`count(*)` })
          .from(subscribers)
          .where(and(isNotNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt))),
        db
          .select({ n: sql<number>`count(*)` })
          .from(subscribers)
          .where(and(isNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt))),
        db
          .select({ n: sql<number>`count(*)` })
          .from(subscribers)
          .where(isNotNull(subscribers.unsubscribedAt)),
      ]);
      rows = list;
      counts = {
        total: Number(totalRow[0]?.n ?? 0),
        confirmed: Number(confirmedRow[0]?.n ?? 0),
        pending: Number(pendingRow[0]?.n ?? 0),
        unsubscribed: Number(unsubRow[0]?.n ?? 0),
      };
    } catch {
      rows = [];
    }
  }

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.confirmed} confirmed · {counts.pending} pending · {counts.unsubscribed} unsubscribed
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/admin/export?type=subscribers" className="btn-secondary">Download CSV</a>
          <form action={sendDigestNowAction}>
            <button type="submit" className="btn-primary">
              Send digest now ({counts.confirmed})
            </button>
          </form>
        </div>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "unsubscribed" && "Subscriber ditandai unsubscribed."}
          {sp.ok === "deleted" && "Subscriber dihapus."}
          {sp.ok.startsWith("resent") && `Konfirmasi dikirim ulang (${sp.ok.slice(7)}).`}
        </p>
      )}
      {typeof sp.digest === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Digest terkirim: {sp.digest.replace("sent-", "").replace("-of-", " dari ")}.
        </p>
      )}
      {sp.error === "digest_failed" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Gagal mengirim digest — periksa RESEND_API_KEY.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/newsletter?status=${tab.key}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === tab.key ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "all" && ` (${counts.total})`}
          </Link>
        ))}
        <form className="ml-auto flex gap-2" action="/admin/newsletter">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Cari email…" className="input max-w-[220px] !py-1 text-xs" />
          <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">Search</button>
        </form>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Terdaftar</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada subscriber.
                </td>
              </tr>
            ) : (
              rows.map((s) => {
                const state = statusOf(s);
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{s.email}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-semibold ${
                          state === "confirmed"
                            ? "text-success"
                            : state === "pending"
                              ? "text-warning"
                              : "text-muted-foreground"
                        }`}
                      >
                        {state}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {state !== "confirmed" && (
                          <form action={resendConfirmationAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                              Resend confirm
                            </button>
                          </form>
                        )}
                        {state !== "unsubscribed" && (
                          <form action={unsubscribeSubscriberAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                              Unsubscribe
                            </button>
                          </form>
                        )}
                        <form action={deleteSubscriberAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="btn-secondary !px-2 !py-1 text-xs text-destructive">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
