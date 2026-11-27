import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { listApprovals } from "@/lib/approvals";
import { formatDate } from "@/lib/slug";
import { decideApprovalAction } from "./actions";

export const dynamic = "force-dynamic";

function payloadText(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const [pending, approved, rejected] = await Promise.all([
    listApprovals("pending"),
    listApprovals("approved", 10),
    listApprovals("rejected", 10),
  ]);
  const approvalOn = Boolean(process.env.ADMIN_REQUIRE_APPROVAL?.trim());

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Four-eyes approval untuk refund dan perubahan harga.{" "}
          {approvalOn ? (
            <>
              Aktif untuk:{" "}
              <code className="rounded bg-muted px-1 py-0.5">{process.env.ADMIN_REQUIRE_APPROVAL}</code>.
            </>
          ) : (
            <>
              Belum aktif — set <code className="rounded bg-muted px-1 py-0.5">ADMIN_REQUIRE_APPROVAL=refund,price</code>{" "}
              untuk mengaktifkan.
            </>
          )}
        </p>
      </div>

      {sp.queued === "1" && (
        <p className="mt-4 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
          Permintaan masuk antrean. Admin lain (token berbeda) perlu menyetujui.
        </p>
      )}
      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "approved" && "Disetujui dan dijalankan."}
          {sp.ok === "rejected" && "Ditolak."}
        </p>
      )}
      {typeof sp.error === "string" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {sp.error === "same_admin" && "Tidak bisa menyetujui permintaan Anda sendiri — butuh admin lain."}
          {sp.error === "not_pending" && "Permintaan ini sudah diproses."}
          {sp.error === "missing" && "Order terkait tidak ditemukan."}
          {sp.error === "execute" && "Gagal menjalankan aksi (cek data / jumlah refund)."}
          {sp.error === "payload" && "Payload tidak valid."}
          {sp.error === "unknown" && "Jenis approval tidak dikenal."}
          {sp.error === "invalid" && "Permintaan tidak valid."}
        </p>
      )}

      <h2 className="mt-6 text-lg font-semibold">Menunggu persetujuan ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="card mt-3 p-5 text-sm text-muted-foreground">
          Tidak ada antrean.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pending.map((approval) => (
            <li key={approval.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      {approval.kind}
                    </span>
                    <span className="font-medium">{approval.target}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{approval.summary}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Diminta oleh {approval.requestedBy} · {formatDate(approval.createdAt)}
                  </p>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Payload</summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-[10px]">
                      {payloadText(approval.payload)}
                    </pre>
                  </details>
                </div>
                <div className="w-full max-w-xs space-y-2">
                  <input
                    name="note"
                    form={`approve-${approval.id}`}
                    placeholder="Catatan (opsional)"
                    className="input !py-1 text-xs"
                  />
                  <div className="flex gap-2">
                    <form id={`approve-${approval.id}`} action={decideApprovalAction} className="flex-1">
                      <input type="hidden" name="id" value={approval.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button type="submit" className="btn-primary w-full !px-2 !py-1 text-xs">
                        Approve &amp; jalankan
                      </button>
                    </form>
                    <form action={decideApprovalAction}>
                      <input type="hidden" name="id" value={approval.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Disetujui terakhir</h2>
          {approved.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Belum ada.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {approved.map((approval) => (
                <li key={approval.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs">
                    {approval.kind} · {approval.target}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {approval.decidedBy ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Ditolak terakhir</h2>
          {rejected.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Belum ada.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {rejected.map((approval) => (
                <li key={approval.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs">
                    {approval.kind} · {approval.target}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {approval.decidedBy ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
