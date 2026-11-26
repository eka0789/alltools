import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Pencil,
  RefreshCw,
  ShieldQuestion,
} from "lucide-react";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { db, DB_ACTIVE } from "@/db/client";
import { linkChecks, type LinkCheck } from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  checkBatchAction,
  checkToolNowAction,
  deprecateToolAction,
  ignoreToolLinkAction,
  markToolReviewedAction,
  recheckLaterAction,
  restoreToolLinkAction,
} from "./actions";

export const dynamic = "force-dynamic";

function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Kept outside the component so the render-purity lint rule does not treat
// the clock read as unstable render output.
function nowMs(): number {
  return Date.now();
}

export default async function LinkHealthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;

  const catalog = getCatalog();
  const now = nowMs();
  const needsReviewTools = catalog.tools.filter((t) => t.status === "needs_review");
  const isDeferred = (tool: (typeof catalog.tools)[number]) =>
    Boolean(tool.linkIgnoredAt) || Boolean(tool.recheckAfter && tool.recheckAfter > now);
  const flagged = needsReviewTools
    .filter((t) => !isDeferred(t))
    .sort((a, b) => a.name.localeCompare(b.name));
  const deferred = needsReviewTools
    .filter(isDeferred)
    .sort((a, b) => a.name.localeCompare(b.name));
  const verifiedCount = catalog.tools.filter((t) => t.verified).length;
  const deprecatedCount = catalog.tools.filter((t) => t.status === "deprecated").length;

  let recent: LinkCheck[] = [];
  if (DB_ACTIVE) {
    try {
      recent = await db
        .select()
        .from(linkChecks)
        .orderBy(desc(linkChecks.checkedAt))
        .limit(400);
    } catch {
      recent = [];
    }
  }
  const lastByTool = new Map<number, LinkCheck>();
  for (const check of recent) {
    if (!lastByTool.has(check.toolId)) lastByTool.set(check.toolId, check);
  }

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Link Health Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifikasi URL langsung dari sini. Flagged tools (404/410/DNS) tetap tampil
            publik sampai Anda memperbaiki atau mendepresiasinya.
          </p>
        </div>
        <form action={checkBatchAction}>
          <button type="submit" className="btn-primary">
            <RefreshCw className="h-4 w-4" /> Check next 6
          </button>
        </form>
      </div>

      {typeof sp.checked === "string" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
          Check finished: <strong>{sp.checked}</strong>.
        </p>
      )}
      {typeof sp.batch === "string" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
          Batch result: {sp.batch.split("-").join(" · ")}.
        </p>
      )}
      {sp.error === "not_found" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Tool not found — it may have been deleted.
        </p>
      )}
      {sp.error === "forbidden" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Your role cannot manage link health.
        </p>
      )}
      {typeof sp.row === "string" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
          {sp.row === "ignored" &&
            "URL diabaikan — tidak tampil di daftar flagged dan dilewati cron checker."}
          {sp.row === "restored" && "URL dipulihkan dari daftar ignore/defer."}
          {sp.row.startsWith("deferred") && "Pengecekan berikutnya ditunda sesuai pilihan."}
          {sp.row === "active" && "Ditandai aktif/verified."}
          {sp.row === "review" && "Ditandai needs review."}
          {sp.row === "deprecated" && "Tool didepresiasi."}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Catalog tools</p>
          <p className="mt-1 text-2xl font-bold">{catalog.total.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Verified</p>
          <p className="mt-1 flex items-center gap-1 text-2xl font-bold text-success">
            <CheckCircle2 className="h-5 w-5" /> {verifiedCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Needs review</p>
          <p className={`mt-1 flex items-center gap-1 text-2xl font-bold ${flagged.length > 0 ? "text-warning" : ""}`}>
            <AlertTriangle className="h-5 w-5" /> {flagged.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Deprecated</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">{deprecatedCount}</p>
        </div>
      </div>

      <h2 className="mt-9 text-lg font-semibold">Flagged tools ({flagged.length})</h2>
      {flagged.length === 0 ? (
        <p className="card mt-3 p-5 text-sm text-muted-foreground">
          Tidak ada tools yang ditandai. Link checker belum menemukan masalah.
        </p>
      ) : (
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Tool</th>
                <th className="px-4 py-3">Last check</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((tool) => {
                const last = lastByTool.get(tool.id);
                return (
                  <tr key={tool.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">{tool.name}</span>
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        {tool.url} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {last ? (
                        <>
                          <span className={last.ok ? "text-success" : "text-warning"}>
                            {last.httpStatus ?? last.error ?? "error"}
                          </span>
                          <span className="block text-muted-foreground">
                            {fmtDateTime(last.checkedAt)} · {last.responseTimeMs ?? 0}ms
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">never checked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <form action={checkToolNowAction}>
                          <input type="hidden" name="id" value={tool.id} />
                          <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                            Check now
                          </button>
                        </form>
                        <Link
                          href={`/admin/tools/${tool.id}`}
                          className="btn-secondary !px-2 !py-1 text-xs"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Link>
                        <form action={markToolReviewedAction}>
                          <input type="hidden" name="id" value={tool.id} />
                          <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                            Mark OK
                          </button>
                        </form>
                        <form action={ignoreToolLinkAction}>
                          <input type="hidden" name="id" value={tool.id} />
                          <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                            Ignore
                          </button>
                        </form>
                        <form action={recheckLaterAction}>
                          <input type="hidden" name="id" value={tool.id} />
                          <input type="hidden" name="days" value="7" />
                          <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                            Recheck 7d
                          </button>
                        </form>
                        <form action={deprecateToolAction}>
                          <input type="hidden" name="id" value={tool.id} />
                          <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                            Deprecate
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-9 text-lg font-semibold">
        Ditunda / diabaikan ({deferred.length})
      </h2>
      {deferred.length === 0 ? (
        <p className="card mt-3 p-5 text-sm text-muted-foreground">
          Tidak ada URL yang di-ignore atau ditunda.
        </p>
      ) : (
        <ul className="card mt-3 divide-y divide-border text-sm">
          {deferred.map((tool) => (
            <li key={tool.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="min-w-0">
                <span className="font-medium">{tool.name}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">{tool.url}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {tool.linkIgnoredAt
                    ? "diabaikan (ignore)"
                    : `ditunda sampai ${fmtDateTime(tool.recheckAfter)}`}
                </span>
              </span>
              <form action={restoreToolLinkAction}>
                <input type="hidden" name="id" value={tool.id} />
                <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                  Restore
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-9 flex items-center gap-2">
        <ShieldQuestion className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Recently checked</h2>
      </div>
      {recent.length === 0 ? (
        <p className="card mt-3 p-5 text-sm text-muted-foreground">
          Belum ada riwayat pengecekan. Jalankan &quot;Check next 6&quot; atau cron
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">/api/cron/check-links</code>.
        </p>
      ) : (
        <ul className="card mt-3 divide-y divide-border text-sm">
          {recent.slice(0, 20).map((check) => {
            const tool = catalog.byId.get(check.toolId);
            return (
              <li key={check.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span className="min-w-0">
                  {tool ? (
                    <Link href={`/tools/${tool.slug}`} className="font-medium hover:text-accent">
                      {tool.name}
                    </Link>
                  ) : (
                    <span className="font-medium">#{check.toolId}</span>
                  )}
                  <span className="ml-2 truncate text-xs text-muted-foreground">{check.url}</span>
                </span>
                <span className="shrink-0 text-xs">
                  <span className={check.ok ? "text-success" : "text-warning"}>
                    {check.httpStatus ?? check.error ?? "error"}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {fmtDateTime(check.checkedAt)} · {check.responseTimeMs ?? 0}ms
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/admin/tools" className="btn-secondary">
          ← Manage tools
        </Link>
      </div>
    </div>
  );
}
