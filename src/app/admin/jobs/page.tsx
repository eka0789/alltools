import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { latestJobRuns, TRACKED_JOBS } from "@/lib/job-runs";
import {
  triggerCheckLinksAction,
  triggerDigestAction,
  triggerReconcileAction,
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

function statusClass(status: string): string {
  if (status === "success") return "text-success";
  if (status === "failed") return "text-warning";
  if (status === "running") return "text-accent";
  return "text-muted-foreground";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const runs = await latestJobRuns(150);

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs & Cron</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Riwayat run terakhir dan trigger manual. Kegagalan otomatis memicu notifikasi.
          </p>
        </div>
        <Link href="/admin/ops" className="btn-secondary">← Ops Center</Link>
      </div>

      {typeof sp.result === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Job selesai dijalankan ({sp.result}).
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-semibold">Link health sweep</h2>
          <p className="mt-1 text-xs text-muted-foreground">Cek 6 URL berikutnya (flag → aktif).</p>
          <form action={triggerCheckLinksAction} className="mt-3">
            <button type="submit" className="btn-primary text-xs">Run now</button>
          </form>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">DOKU reconciliation</h2>
          <p className="mt-1 text-xs text-muted-foreground">Cocokkan order pending dengan status DOKU.</p>
          <form action={triggerReconcileAction} className="mt-3">
            <button type="submit" className="btn-primary text-xs">Run now</button>
          </form>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Weekly digest</h2>
          <p className="mt-1 text-xs text-muted-foreground">Kirim digest ke subscriber confirmed.</p>
          <form action={triggerDigestAction} className="mt-3">
            <button type="submit" className="btn-primary text-xs">Send now</button>
          </form>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <div className="px-4 pt-4">
          <h2 className="font-semibold">Riwayat run ({runs.length})</h2>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Mulai</th>
              <th className="px-4 py-2">Selesai</th>
              <th className="px-4 py-2">Ringkasan</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada run. Trigger manual di atas atau tunggu jadwal cron.
                </td>
              </tr>
            ) : (
              runs.map((run) => {
                const label =
                  TRACKED_JOBS.find((job) => job.key === run.job)?.label ?? run.job;
                return (
                  <tr key={run.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{label}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">{run.job}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-xs font-semibold ${statusClass(run.status)}`}>
                      {run.status}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDateTime(run.startedAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDateTime(run.finishedAt)}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {run.error ? <span className="text-warning">{run.error}</span> : run.summary || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Cron otomatis tetap berjalan lewat <code className="rounded bg-muted px-1 py-0.5">/api/cron/*</code>{" "}
        (Vercel Cron / penjadwal eksternal). Halaman ini untuk trigger & audit manual.
      </p>
    </div>
  );
}
