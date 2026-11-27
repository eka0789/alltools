import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { emailCampaigns, type EmailCampaign } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { campaignEngagement } from "@/lib/campaigns";
import { formatDate } from "@/lib/slug";
import {
  cancelCampaignAction,
  createCampaignAction,
  deleteCampaignAction,
  sendCampaignAction,
  testCampaignAction,
} from "./actions";

export const dynamic = "force-dynamic";

const SEGMENTS = [
  { key: "subscribers", label: "Newsletter subscribers (confirmed)" },
  { key: "users", label: "All registered users" },
  { key: "pro", label: "Pro / team customers" },
];

function statusClass(status: string): string {
  if (status === "sent") return "text-success";
  if (status === "scheduled") return "text-accent";
  if (status === "failed") return "text-warning";
  return "text-muted-foreground";
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  let rows: EmailCampaign[] = [];
  if (DB_ACTIVE) {
    try {
      rows = await db
        .select()
        .from(emailCampaigns)
        .orderBy(desc(emailCampaigns.createdAt))
        .limit(100);
    } catch {
      rows = [];
    }
  }
  const engagement = await campaignEngagement(rows.map((row) => row.id));

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Campaigns</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kirim broadcast ke segmen, jadwalkan, dan ukur open/click. Butuh{" "}
          <code className="rounded bg-muted px-1 py-0.5">RESEND_API_KEY</code>.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "created" && "Campaign dibuat."}
          {sp.ok === "cancelled" && "Jadwal dibatalkan."}
          {sp.ok === "deleted" && "Campaign dihapus."}
          {sp.ok === "test" && "Email test terkirim."}
          {sp.ok === "test_failed" && "Email test gagal — periksa RESEND_API_KEY."}
          {sp.ok.startsWith("sent-") &&
            `Campaign terkirim: ${sp.ok.replace("sent-", "").replace("-of-", " dari ")}.`}
        </p>
      )}
      {typeof sp.error === "string" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {sp.error === "validation" && "Subject dan body wajib diisi."}
          {sp.error === "test_email" && "Email test tidak valid."}
          {sp.error === "not_found" && "Campaign tidak ditemukan."}
        </p>
      )}

      <form action={createCampaignAction} className="card mt-6 space-y-3 p-5">
        <h2 className="font-semibold">Campaign baru</h2>
        <input name="subject" required maxLength={160} placeholder="Subject email" className="input text-sm" />
        <textarea
          name="body"
          required
          rows={5}
          maxLength={8000}
          placeholder="Isi email (teks biasa; pisahkan paragraf dengan baris kosong)."
          className="input text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Segment</span>
            <select name="segment" defaultValue="subscribers" className="input text-sm">
              {SEGMENTS.map((segment) => (
                <option key={segment.key} value={segment.key}>
                  {segment.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              Jadwal kirim (opsional)
            </span>
            <input name="scheduledAt" type="datetime-local" className="input text-sm" />
          </label>
          <input name="ctaLabel" maxLength={60} placeholder="Label tombol CTA (opsional)" className="input text-sm" />
          <input name="ctaUrl" type="url" placeholder="URL CTA (opsional)" className="input text-sm" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary text-xs">Simpan campaign</button>
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold">Campaign ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="card mt-3 p-5 text-sm text-muted-foreground">Belum ada campaign.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((campaign) => {
            const stats = engagement.get(campaign.id) ?? { opens: 0, clicks: 0 };
            const openRate = campaign.sentCount > 0 ? (stats.opens / campaign.sentCount) * 100 : 0;
            const clickRate = campaign.sentCount > 0 ? (stats.clicks / campaign.sentCount) * 100 : 0;
            return (
              <li key={campaign.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{campaign.subject}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className={`font-semibold ${statusClass(campaign.status)}`}>{campaign.status}</span>
                      {" · "}segment {campaign.segment}
                      {campaign.scheduledAt ? ` · jadwal ${formatDate(campaign.scheduledAt)}` : ""}
                      {campaign.sentAt ? ` · terkirim ${formatDate(campaign.sentAt)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {campaign.sentCount}/{campaign.recipients} terkirim · {stats.opens} open (
                      {openRate.toFixed(1)}%) · {stats.clicks} klik ({clickRate.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {(campaign.status === "draft" || campaign.status === "scheduled") && (
                      <form action={sendCampaignAction}>
                        <input type="hidden" name="id" value={campaign.id} />
                        <button type="submit" className="btn-primary !px-2.5 !py-1 text-xs">
                          Send now
                        </button>
                      </form>
                    )}
                    {campaign.status === "scheduled" && (
                      <form action={cancelCampaignAction}>
                        <input type="hidden" name="id" value={campaign.id} />
                        <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                          Cancel schedule
                        </button>
                      </form>
                    )}
                    <form action={deleteCampaignAction}>
                      <input type="hidden" name="id" value={campaign.id} />
                      <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs text-destructive">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                <form action={testCampaignAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <input type="hidden" name="id" value={campaign.id} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Email test"
                    className="input !w-56 !py-1 text-xs"
                  />
                  <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                    Kirim test
                  </button>
                </form>

                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Preview isi</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-3 text-[11px]">
                    {campaign.body}
                  </pre>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
