import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { approveSubmissionAction, rejectSubmissionAction } from "../actions";
import { formatDate } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) redirect("/admin");

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const errorSlug = typeof sp.slug === "string" ? sp.slug : undefined;

  const all = await db
    .select()
    .from(submissions)
    .orderBy(desc(submissions.createdAt));
  const pending = all.filter((s) => s.status === "pending");
  const reviewed = all.filter((s) => s.status !== "pending");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review community submissions before publishing. Approving creates the
        tool entry as unverified; run the link checker afterwards.
      </p>

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

      <h2 className="mt-8 text-lg font-semibold">
        Pending <span className="text-sm font-normal text-muted-foreground">({pending.length})</span>
      </h2>
      {pending.length === 0 ? (
        <p className="card mt-3 p-5 text-sm text-muted-foreground">
          No pending submissions.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pending.map((s) => (
            <li key={s.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{s.name}</p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-accent hover:underline"
                  >
                    {s.url}
                  </a>
                  <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Category: {s.categorySlug} · Pricing: {s.pricing} ·{" "}
                    {s.tags.length > 0 && <>Tags: {JSON.parse(s.tags).join(", ")} · </>}
                    {formatDate(s.createdAt)}
                  </p>
                  {(s.githubUrl || s.documentationUrl) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.githubUrl && <span>GitHub: {s.githubUrl} </span>}
                      {s.documentationUrl && <span>Docs: {s.documentationUrl}</span>}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveSubmissionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="btn-primary">Approve</button>
                  </form>
                  <form action={rejectSubmissionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="btn-secondary">Reject</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Reviewed</h2>
          <ul className="card mt-3 divide-y divide-border text-sm">
            {reviewed.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0">
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{s.url}</span>
                </span>
                <span
                  className={`tag-badge ${
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
