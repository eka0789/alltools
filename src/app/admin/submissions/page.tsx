import { redirect } from "next/navigation";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { submissions } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { safeHttpUrl } from "@/lib/url-check";
import {
  approveSubmissionAction,
  bulkApproveSubmissionsAction,
  rejectSubmissionAction,
} from "../actions";
import { formatDate } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "moderate")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const errorSlug = typeof sp.slug === "string" ? sp.slug : undefined;

  // Guarded: a broken/absent DB (serverless :memory: fallback) must not 500.
  let all: (typeof submissions.$inferSelect)[] = [];
  if (DB_ACTIVE) {
    try {
      all = await db.select().from(submissions).orderBy(desc(submissions.createdAt));
    } catch {
      all = [];
    }
  }
  const pending = all.filter((s) => s.status === "pending" || s.status === "reviewing");
  const reviewed = all.filter((s) => s.status !== "pending" && s.status !== "reviewing");

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review sebelum publish. Approve membuat tool unverified — jalankan link checker setelahnya.
            Gunakan &quot;Edit &amp; approve&quot; untuk memperbaiki data dulu.
          </p>
        </div>
        <form id="sub-bulk" action={bulkApproveSubmissionsAction} className="flex items-center gap-2">
          <button type="submit" className="btn-primary text-xs">Approve selected</button>
          <span className="text-xs text-muted-foreground">Centang submission valid.</span>
        </form>
      </div>

      {error === "category" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Approval failed: category{errorSlug ? ` "${errorSlug}"` : ""} no
          longer exists, so the tool was <strong>not</strong> published. The
          submission is still pending — re-create the category and approve
          again, or reject this submission.
        </p>
      )}
      {error === "save" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Approval failed: the tool entry could not be saved (e.g. a duplicate
          slug). The submission is still pending — try again.
        </p>
      )}
      {error === "url" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Approval failed: the submitted URL is not a valid http(s) address.
          Reject this submission instead.
        </p>
      )}
      {error === "duplicate" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Approval failed: a tool with this website URL is already listed.
          Reject the submission to keep the directory duplicate-free.
        </p>
      )}
      {error === "none" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Tidak ada submission yang dipilih.
        </p>
      )}
      {typeof sp.bulk === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Bulk approve selesai: {sp.bulk.replace("approved-", "").replace("-failed-", " berhasil, ")} gagal.
        </p>
      )}
      {typeof sp.approved === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Submission approved dan dipublikasikan.
        </p>
      )}
      {typeof sp.rejected === "string" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Submission rejected.
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold">
        Pending <span className="text-sm font-normal text-muted-foreground">({pending.length})</span>
      </h2>
      {pending.length === 0 ? (
        <p className="card mt-3 p-5 text-sm text-muted-foreground">No pending submissions.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pending.map((s) => {
            const href = safeHttpUrl(s.url);
            return (
              <li key={s.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      name="ids"
                      value={s.id}
                      form="sub-bulk"
                      className="mt-1 h-4 w-4"
                      aria-label={`Select ${s.name}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {s.name}
                        {s.status === "reviewing" && (
                          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                            reviewing
                          </span>
                        )}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-xs text-accent hover:underline"
                        >
                          {s.url}
                        </a>
                      ) : (
                        <span className="block truncate text-xs text-warning">{s.url}</span>
                      )}
                      <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Category: {s.categorySlug} · Pricing: {s.pricing} ·{" "}
                        {s.tags.length > 2 && <>Tags: {JSON.parse(s.tags).join(", ")} · </>}
                        {formatDate(s.createdAt)}
                      </p>
                      {(s.assignedTo || s.submitterEmail) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {s.assignedTo && <span>PIC: {s.assignedTo} · </span>}
                          {s.submitterEmail && <span>{s.submitterEmail}</span>}
                        </p>
                      )}
                      {s.internalNotes && (
                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                          Catatan: {s.internalNotes}
                        </p>
                      )}
                      {(s.githubUrl || s.documentationUrl) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {s.githubUrl && <span>GitHub: {s.githubUrl} </span>}
                          {s.documentationUrl && <span>Docs: {s.documentationUrl}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/submissions/${s.id}`}
                        className="btn-secondary !px-2.5 !py-1 text-xs"
                      >
                        Edit &amp; approve
                      </Link>
                      <form action={approveSubmissionAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="btn-primary">Approve</button>
                      </form>
                    </div>
                    <form action={rejectSubmissionAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={s.id} />
                      <input
                        name="reason"
                        placeholder="Alasan tolak (opsional)"
                        className="input !w-44 !py-1 text-xs"
                      />
                      <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">Reject</button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Reviewed</h2>
          <ul className="card mt-3 divide-y divide-border text-sm">
            {reviewed.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <span className="min-w-0">
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{s.url}</span>
                  {s.status === "rejected" && s.rejectionReason && (
                    <span className="block text-[11px] text-muted-foreground">
                      Alasan: {s.rejectionReason}
                    </span>
                  )}
                </span>
                <span
                  className={`tag-badge shrink-0 ${
                    s.status === "approved"
                      ? "!bg-success/15 !text-success"
                      : "!bg-warning/15 !text-warning"
                  }`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-8">
        <Link href="/admin" className="btn-secondary">← Back to dashboard</Link>
      </div>
    </div>
  );
}
