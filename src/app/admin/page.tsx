import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Flag, Plus } from "lucide-react";
import { isAdmin, adminToken } from "@/lib/admin";
import { getCatalog, needsReviewCount } from "@/lib/data";
import { formatDate } from "@/lib/slug";
import {
  loginAction,
  logoutAction,
  resolveFeedbackAction,
  dismissFeedbackAction,
  reconcileOrdersAction,
  grantProAction,
} from "./actions";
import { db } from "@/db/client";
import { submissions, feedback, toolClicks, orders, subscribers, users } from "@/db/schema";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { trendingQueries, noResultQueries } from "@/lib/search-analytics";
import { formatIdr, getProduct } from "@/lib/products";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "1": "Invalid token.",
  not_configured: "ADMIN_TOKEN is not configured on this deployment — login is disabled.",
  rate_limited: "Too many attempts. Try again in a few minutes.",
};

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
        {!adminToken() && (
          <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            ADMIN_TOKEN is not set on this server. Set it as an environment
            variable to enable login — there is no default anymore.
          </p>
        )}
        {typeof sp.error === "string" && (
          <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            {ERROR_MESSAGES[sp.error] ?? "Invalid token."}
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

  // Guarded: a broken/absent DB (e.g. serverless :memory: fallback) must not
  // 500 the whole dashboard.
  let pending: (typeof submissions.$inferSelect)[] = [];
  let openFeedback: (typeof feedback.$inferSelect)[] = [];
  let topClicked: { slug: string; clicks: number; weeklyClicks: number }[] = [];
  let topSearches: { query: string; hits: number }[] = [];
  let zeroResult: { query: string; hits: number }[] = [];
  let recentOrders: {
    id: number;
    invoiceNo: string;
    productId: string;
    amount: number;
    status: string;
    createdAt: number;
    email: string;
  }[] = [];
  let totalRevenueIdr = 0;
  let paidOrdersCount = 0;
  let pendingOrdersCount = 0;
  let confirmedSubscriberCount = 0;

  if (db) {
    try {
      pending = await db
        .select()
        .from(submissions)
        .where(eq(submissions.status, "pending"))
        .orderBy(desc(submissions.createdAt));
      openFeedback = await db
        .select()
        .from(feedback)
        .where(eq(feedback.status, "open"))
        .orderBy(desc(feedback.createdAt))
        .limit(20);
      topClicked = await db
        .select({
          slug: toolClicks.slug,
          clicks: toolClicks.clicks,
          weeklyClicks: toolClicks.weeklyClicks,
        })
        .from(toolClicks)
        .orderBy(desc(toolClicks.weeklyClicks), desc(toolClicks.clicks))
        .limit(10);
      topSearches = await trendingQueries(30, 10);
      zeroResult = await noResultQueries(30, 10);
    } catch {
      // tables missing / db unavailable — dashboard stays up
    }

    try {
      const allOrders = await db
        .select({
          id: orders.id,
          invoiceNo: orders.invoiceNo,
          productId: orders.productId,
          amount: orders.amount,
          status: orders.status,
          createdAt: orders.createdAt,
          email: users.email,
        })
        .from(orders)
        .innerJoin(users, eq(users.id, orders.userId))
        .orderBy(desc(orders.createdAt))
        .limit(100);
      recentOrders = allOrders.slice(0, 10);
      for (const o of allOrders) {
        if (o.status === "paid") {
          paidOrdersCount += 1;
          totalRevenueIdr += o.amount;
        } else if (o.status === "pending") {
          pendingOrdersCount += 1;
        }
      }
      const subs = await db
        .select({ id: subscribers.id })
        .from(subscribers)
        .where(and(isNotNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt)));
      confirmedSubscriberCount = subs.length;
    } catch {
      // Pro/newsletter tables may not exist yet — degrade cleanly
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </div>

      {typeof sp.reconciled === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Reconciled {sp.checked ?? "0"} pending order(s) — {sp.reconciled} marked paid.
        </p>
      )}
      {typeof sp.granted === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Granted Pro Lifetime (pro_all) to {sp.granted}.
        </p>
      )}
      {typeof sp.grant_error === "string" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Invalid email address for Pro grant.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Open reports</p>
          <p className={`mt-1 text-3xl font-bold ${openFeedback.length > 0 ? "text-warning" : ""}`}>
            {openFeedback.length}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Flag className="h-3 w-3" /> broken links &amp; edit suggestions
          </p>
        </div>
      </div>

      {/* Monetization & Growth overview */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Revenue (Paid)</p>
          <p className="mt-1 text-2xl font-bold text-success">{formatIdr(totalRevenueIdr)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{paidOrdersCount} paid order(s)</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending Orders</p>
          <p className={`mt-1 text-2xl font-bold ${pendingOrdersCount > 0 ? "text-warning" : ""}`}>
            {pendingOrdersCount}
          </p>
          <form action={reconcileOrdersAction} className="mt-2">
            <button type="submit" className="text-xs font-medium text-accent hover:underline">
              Reconcile with DOKU now →
            </button>
          </form>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Newsletter Subscribers</p>
          <p className="mt-1 text-2xl font-bold">{confirmedSubscriberCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Confirmed double opt-in</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href="/admin/tools/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add tool
        </Link>
        <Link href="/admin/tools" className="btn-secondary">All tools</Link>
        <Link href="/admin/submissions" className="btn-secondary">Submissions</Link>
      </div>

      {/* Manual Pro Grant + Recent Orders */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-semibold">Grant Pro Manually</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Give Pro Lifetime access (<code className="font-mono">pro_all</code>) to an email for support, partners, or manual transfers.
          </p>
          <form action={grantProAction} className="mt-4 space-y-3">
            <input
              type="email"
              name="email"
              required
              placeholder="developer@example.com"
              className="input"
            />
            <button type="submit" className="btn-primary w-full">
              Grant Pro Lifetime
            </button>
          </form>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Recent Orders</h2>
            <form action={reconcileOrdersAction}>
              <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                Sync DOKU Status
              </button>
            </form>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {getProduct(o.productId)?.name ?? o.productId}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{o.invoiceNo}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.email} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatIdr(o.amount)}</p>
                    <p
                      className={`text-xs ${
                        o.status === "paid"
                          ? "text-success"
                          : o.status === "pending"
                            ? "text-warning"
                            : "text-muted-foreground"
                      }`}
                    >
                      {o.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(topSearches.length > 0 || zeroResult.length > 0) && (
        <div className="card mt-8 p-5">
          <h2 className="font-semibold">Search analytics (30 days)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Anonymous query log from /search. Zero-result queries are the
            cheapest curation roadmap — they show what users wanted and
            couldn&apos;t find.
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top queries
              </h3>
              {topSearches.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No searches yet.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {topSearches.map((s) => (
                    <li key={s.query} className="flex items-center justify-between gap-3">
                      <Link
                        href={`/search?q=${encodeURIComponent(s.query)}`}
                        className="min-w-0 truncate hover:text-accent"
                      >
                        {s.query}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.hits}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Zero results — curation opportunities
              </h3>
              {zeroResult.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nothing so far — every search found something.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {zeroResult.map((s) => (
                    <li key={s.query} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-warning">{s.query}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.hits}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {topClicked.length > 0 && (
        <div className="card mt-8 p-5">
          <h2 className="font-semibold">Most opened tools</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Outbound clicks recorded by the tracker — weekly first. This is
            the popularity signal behind the homepage ranking.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {topClicked.map((c, i) => {
              const tool = catalog.bySlug.get(c.slug);
              return (
                <li key={c.slug} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                    {tool ? (
                      <Link href={`/tools/${c.slug}`} className="font-medium hover:text-accent">
                        {tool.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{c.slug}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {c.weeklyClicks} this week · {c.clicks} all-time
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {openFeedback.length > 0 && (
        <div className="card mt-8 p-5">
          <h2 className="font-semibold">Community reports</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {openFeedback.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="min-w-0">
                  <span className={`font-medium ${f.type === "broken_link" ? "text-warning" : ""}`}>
                    {f.type === "broken_link" ? "Broken link" : "Edit suggestion"}
                  </span>
                  <span className="ml-2">
                    <Link href={`/tools/${f.toolSlug}`} className="text-accent hover:underline">
                      {f.toolSlug}
                    </Link>
                  </span>
                  {f.message && (
                    <span className="block truncate text-xs text-muted-foreground">“{f.message}”</span>
                  )}
                  <span className="block text-[10px] text-muted-foreground/70">
                    {formatDate(f.createdAt)}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
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
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          (locally or via CI — it now works against Turso too), or let the Vercel
          Cron hit <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/cron/check-links</code>{" "}
          daily. Tools returning 404/410 or domain errors are marked{" "}
          <code className="text-xs">needs_review</code> — never auto-deleted.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          Last runs are recorded per tool in the link_checks table
        </p>
      </div>
    </div>
  );
}
