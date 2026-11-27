import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db, DB_ACTIVE, DB_IS_REMOTE } from "@/db/client";
import { tools } from "@/db/schema";
import { adminTokenCount, getAdminIdentity, roleCan } from "@/lib/admin";
import { dokuConfigured } from "@/lib/doku";
import { emailConfigured } from "@/lib/email";
import { llmEnabled } from "@/lib/chat/llm";
import { latestJobRuns, latestPerJob, TRACKED_JOBS } from "@/lib/job-runs";
import { refreshCatalogAction, runGithubStatsAction } from "./actions";

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

function jobStatusClass(status: string): string {
  if (status === "success") return "text-success";
  if (status === "failed") return "text-warning";
  if (status === "running") return "text-accent";
  return "text-muted-foreground";
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");

  const sp = await searchParams;

  let dbStatus = "unavailable";
  if (DB_ACTIVE) {
    try {
      const rows = await db.select({ n: sql<number>`count(*)` }).from(tools);
      dbStatus = `${Number(rows[0]?.n ?? 0).toLocaleString()} rows in tools`;
    } catch {
      dbStatus = "query failed";
    }
  }

  const checks: { label: string; ok: boolean; note?: string }[] = [
    { label: "Admin tokens", ok: adminTokenCount() > 0, note: `${adminTokenCount()} configured` },
    {
      label: "Database",
      ok: DB_ACTIVE,
      note: DB_ACTIVE ? (DB_IS_REMOTE ? `remote (Turso/libSQL) · ${dbStatus}` : `local SQLite · ${dbStatus}`) : "inactive",
    },
    { label: "Resend email", ok: emailConfigured(), note: emailConfigured() ? "configured" : "welcome/login emails disabled" },
    { label: "DOKU payments", ok: dokuConfigured(), note: dokuConfigured() ? "configured" : "simulation only / disabled" },
    { label: "Cron secret", ok: Boolean(process.env.CRON_SECRET?.trim()) },
    { label: "Sentry", ok: Boolean(process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) },
    { label: "LLM (DevDict / AI suggest)", ok: llmEnabled() },
    { label: "GitHub token (stats)", ok: Boolean(process.env.GITHUB_TOKEN?.trim()) },
    { label: "Site URL", ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()), note: process.env.NEXT_PUBLIC_SITE_URL ?? "not set" },
  ];

  const jobRuns = await latestJobRuns(60);
  const latestByJob = latestPerJob(jobRuns);

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ops Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status konfigurasi dan tugas operasional yang biasanya butuh terminal.
        </p>
      </div>

      {sp.ok === "catalog" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Catalog cache di-refresh.
        </p>
      )}
      {typeof sp.github === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          GitHub stats: {sp.github.split("-").join(" · ")}.
        </p>
      )}
      {sp.error === "github" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Gagal mengambil GitHub stats — cek koneksi / rate limit.
        </p>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Komponen</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.label} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium">{check.label}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-semibold ${check.ok ? "text-success" : "text-warning"}`}>
                    {check.ok ? "OK" : "Belum diset"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{check.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <div className="px-4 pt-4">
          <h2 className="font-semibold">Cron terakhir</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Riwayat run terakhir per job (tabel <code className="rounded bg-muted px-1 py-0.5">job_runs</code>).
            Kegagalan cron sekarang terlihat di sini, bukan diam-diam.
          </p>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Run terakhir</th>
              <th className="px-4 py-2">Ringkasan</th>
            </tr>
          </thead>
          <tbody>
            {TRACKED_JOBS.map(({ key, label }) => {
              const run = latestByJob.get(key);
              return (
                <tr key={key} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{label}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground">{key}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {run ? (
                      <span className={`font-semibold ${jobStatusClass(run.status)}`}>{run.status}</span>
                    ) : (
                      <span className="text-muted-foreground">belum pernah</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {run ? fmtDateTime(run.finishedAt ?? run.startedAt) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {run ? (
                      run.error ? (
                        <span className="text-warning">{run.error}</span>
                      ) : (
                        run.summary || "—"
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex justify-end px-4 pb-4 pt-2">
          <Link href="/admin/jobs" className="btn-secondary !px-2.5 !py-1 text-xs">
            Riwayat &amp; trigger manual →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-semibold">Refresh catalog cache</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Paksa rebuild catalog in-memory dari database dan revalidate seluruh halaman.
          </p>
          <form action={refreshCatalogAction} className="mt-3">
            <button type="submit" className="btn-primary text-xs">Refresh now</button>
          </form>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">GitHub stats batch</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Isi stars/last-push/license untuk 8 tool yang belum punya data. Set GITHUB_TOKEN
            untuk rate limit lebih tinggi.
          </p>
          <form action={runGithubStatsAction} className="mt-3">
            <button type="submit" className="btn-primary text-xs">Refresh 8 tools</button>
          </form>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Link health</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifikasi 6 URL berikutnya (flag → aktif) langsung dari UI.
          </p>
          <Link href="/admin/link-health" className="btn-primary mt-3 inline-block text-xs">
            Open Link Health
          </Link>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Weekly digest</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Kirim digest minggu ini sekarang (double opt-in subscribers saja).
          </p>
          <Link href="/admin/newsletter" className="btn-primary mt-3 inline-block text-xs">
            Open Newsletter
          </Link>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Audit log</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Lihat jejak semua aksi admin, download CSV.
          </p>
          <Link href="/admin/audit" className="btn-secondary mt-3 inline-block text-xs">
            Open Audit Log
          </Link>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Backup / CLI</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Backup database & pengecekan penuh tetap via terminal:{" "}
            <code className="rounded bg-muted px-1 py-0.5">node scripts/backup-db.mjs</code> dan{" "}
            <code className="rounded bg-muted px-1 py-0.5">npm run check-links</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
