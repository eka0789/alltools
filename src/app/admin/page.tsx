import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { isAdmin } from "@/lib/admin";
import { getCatalog, needsReviewCount } from "@/lib/data";
import { formatDate } from "@/lib/slug";
import { loginAction, logoutAction } from "./actions";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const authed = await isAdmin();

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <h1 className="text-xl font-bold">Admin Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the admin token (env ADMIN_TOKEN).
        </p>
        {sp.error && (
          <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            Invalid token.
          </p>
        )}
        <form action={loginAction} className="card mt-5 space-y-4 p-5">
          <input
            type="password"
            name="token"
            required
            placeholder="Admin token"
            className="input"
          />
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const catalog = getCatalog();
  const needsReview = await needsReviewCount();
  const pending = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, "pending"))
    .orderBy(desc(submissions.createdAt));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Tools</p>
          <p className="mt-1 text-3xl font-bold">{catalog.total.toLocaleString()}</p>
          <Link href="/admin/tools" className="mt-2 inline-block text-xs text-accent hover:underline">
            Manage tools →
          </Link>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Needs review</p>
          <p className={`mt-1 text-3xl font-bold ${needsReview > 0 ? "text-warning" : ""}`}>
            {needsReview}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3" /> flagged by the link checker
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending submissions</p>
          <p className="mt-1 text-3xl font-bold">{pending.length}</p>
          <Link href="/admin/submissions" className="mt-2 inline-block text-xs text-accent hover:underline">
            Review submissions →
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/admin/tools/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add tool
        </Link>
        <Link href="/admin/tools" className="btn-secondary">All tools</Link>
        <Link href="/admin/submissions" className="btn-secondary">Submissions</Link>
      </div>

      {pending.length > 0 && (
        <div className="card mt-8 p-5">
          <h2 className="font-semibold">Latest pending submissions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pending.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                <span className="min-w-0">
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-muted-foreground">{s.url}</span>
                </span>
                <Link href="/admin/submissions" className="shrink-0 text-xs text-accent hover:underline">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card mt-8 p-5">
        <h2 className="font-semibold">Link health</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run check-links</code>{" "}
          to verify every tool URL (HTTP status, redirects, response time).
          Tools returning 404/410 or domain errors are marked{" "}
          <code className="text-xs">needs_review</code> — never auto-deleted.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          Last runs are recorded per tool in the link_checks table
          {catalog.recent.length > 0 && <> · data snapshot {formatDate(Date.now())}</>}
        </p>
      </div>
    </div>
  );
}
