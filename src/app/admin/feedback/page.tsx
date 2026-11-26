import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { feedback, type Feedback } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { formatDate } from "@/lib/slug";
import { dismissFeedbackAction, resolveFeedbackAction } from "../actions";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "Semua" },
];

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "moderate")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const status = String(sp.status ?? "open");
  const type = String(sp.type ?? "");
  const catalog = getCatalog();

  let rows: Feedback[] = [];
  const counts = { open: 0, resolved: 0, dismissed: 0, total: 0 };

  if (DB_ACTIVE) {
    try {
      const conditions = [];
      if (status !== "all") conditions.push(eq(feedback.status, status));
      if (type) conditions.push(eq(feedback.type, type));

      const [list, grouped] = await Promise.all([
        db
          .select()
          .from(feedback)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(feedback.createdAt))
          .limit(200),
        db
          .select({ status: feedback.status, n: sql<number>`count(*)` })
          .from(feedback)
          .groupBy(feedback.status),
      ]);
      rows = list;
      for (const g of grouped) {
        const n = Number(g.n);
        if (g.status === "open") counts.open = n;
        else if (g.status === "resolved") counts.resolved = n;
        else if (g.status === "dismissed") counts.dismissed = n;
        counts.total += n;
      }
    } catch {
      rows = [];
    }
  }

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broken-link reports dan saran edit dari halaman tool.
          </p>
        </div>
        <a href="/admin/export?type=feedback" className="btn-secondary">Download CSV</a>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/feedback?status=${tab.key}${type ? `&type=${type}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === tab.key
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && ` (${counts[tab.key as "open" | "resolved" | "dismissed"]})`}
          </Link>
        ))}
        <div className="ml-auto flex gap-2 text-xs">
          <Link
            href={`/admin/feedback?status=${status}${type === "broken_link" ? "" : "&type=broken_link"}`}
            className={`rounded-full px-3 py-1 ${type === "broken_link" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Broken link
          </Link>
          <Link
            href={`/admin/feedback?status=${status}${type === "edit_suggestion" ? "" : "&type=edit_suggestion"}`}
            className={`rounded-full px-3 py-1 ${type === "edit_suggestion" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Edit suggestion
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="card mt-5 p-5 text-sm text-muted-foreground">Tidak ada laporan.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((f) => (
            <li key={f.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        f.type === "broken_link"
                          ? "bg-warning/15 text-warning"
                          : "bg-accent-soft text-accent"
                      }`}
                    >
                      {f.type === "broken_link" ? "Broken link" : "Edit suggestion"}
                    </span>
                    <Link href={`/tools/${f.toolSlug}`} className="text-sm font-medium text-accent hover:underline">
                      {f.toolSlug}
                    </Link>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.status}</span>
                  </p>
                  {f.message ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">{f.message}</p>
                  ) : (
                    <p className="mt-1.5 text-xs italic text-muted-foreground/70">(tanpa pesan)</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground/70">{formatDate(f.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {catalog.bySlug.get(f.toolSlug) && (
                    <Link
                      href={`/admin/tools/${catalog.bySlug.get(f.toolSlug)!.id}`}
                      className="btn-secondary !px-2.5 !py-1 text-xs"
                    >
                      Open tool
                    </Link>
                  )}
                  {f.status === "open" && (
                    <>
                      <form action={resolveFeedbackAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                          Resolve
                        </button>
                      </form>
                      <form action={dismissFeedbackAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                          Dismiss
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
