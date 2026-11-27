import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Flag,
  HeartPulse,
  Inbox,
  Mail,
  Plus,
  Receipt,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { getAdminIdentity, roleCan, adminToken } from "@/lib/admin";
import { getCatalog, needsReviewCount } from "@/lib/data";
import { formatDate } from "@/lib/slug";
import {
  loginAction,
  resolveFeedbackAction,
  dismissFeedbackAction,
  reconcileOrdersAction,
  grantProAction,
  createCouponAction,
  updateCouponAction,
  toggleCouponAction,
  deleteCouponAction,
} from "./actions";
import { db } from "@/db/client";
import {
  submissions,
  feedback,
  toolClicks,
  orders,
  subscribers,
  users,
  coupons,
  type Coupon,
} from "@/db/schema";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
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
  ip: "This IP is not allowed to access the admin area (ADMIN_IP_ALLOWLIST).",
};

const QUICK_ACTIONS = [
  { href: "/admin/tools", label: "All tools", icon: Wrench },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/link-health", label: "Link Health", icon: HeartPulse },
  { href: "/admin/feedback", label: "Reports", icon: Flag },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/ops", label: "Ops", icon: Settings2 },
];

function StatCard({
  icon,
  label,
  value,
  valueClassName = "",
  href,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
  href: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="card group p-5 transition duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="rounded-lg bg-muted p-1.5 text-muted-foreground transition-colors group-hover:text-accent">
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-3xl font-bold ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-xs text-muted-foreground transition-colors group-hover:text-accent">
        {hint}
      </p>
    </Link>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const identity = await getAdminIdentity();

  if (!identity) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4 py-16">
        <div className="card p-6">
          <div className="mb-5 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="mt-3 text-xl font-bold tracking-tight">Admin Login</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Masukkan token admin (<code className="rounded bg-muted px-1 py-0.5 text-xs">ADMIN_TOKEN</code>).
            </p>
          </div>
          {!adminToken() && (
            <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              ADMIN_TOKEN is not set on this server. Set it as an environment
              variable to enable login — there is no default anymore.
            </p>
          )}
          {typeof sp.error === "string" && (
            <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              {ERROR_MESSAGES[sp.error] ?? "Invalid token."}
            </p>
          )}
          <form action={loginAction} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Admin token</span>
              <input
                type="password"
                name="token"
                required
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="input"
              />
            </label>
            <button type="submit" className="btn-primary w-full">
              Sign in
            </button>
          </form>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Sesi admin tercatat dan dapat dicabut dari menu Admin Sessions.
          </p>
        </div>
      </div>
    );
  }

  const canBilling = roleCan(identity.role, "billing");
  const canCatalog = roleCan(identity.role, "catalog");
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
  let allCoupons: Coupon[] = [];
  let couponStats: { code: string; uses: number; revenue: number }[] = [];

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

    if (canBilling) {
      try {
        // Accurate SQL aggregation across ALL orders (never truncated by .limit()).
        const [paidAgg, pendingAgg, recent] = await Promise.all([
          db
            .select({
              count: sql<number>`COUNT(*)`,
              revenue: sql<number>`COALESCE(SUM(${orders.amount} - ${orders.refundedAmount}), 0)`,
            })
            .from(orders)
            .where(eq(orders.status, "paid")),
          db
            .select({ count: sql<number>`COUNT(*)` })
            .from(orders)
            .where(eq(orders.status, "pending")),
          db
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
            .limit(10),
        ]);
        paidOrdersCount = Number(paidAgg[0]?.count ?? 0);
        totalRevenueIdr = Number(paidAgg[0]?.revenue ?? 0);
        pendingOrdersCount = Number(pendingAgg[0]?.count ?? 0);
        recentOrders = recent;
      } catch {
        // Pro tables may not exist yet — degrade cleanly
      }

      try {
        allCoupons = await db
          .select()
          .from(coupons)
          .orderBy(desc(coupons.createdAt))
          .limit(50);
      } catch {
        // coupons table may not exist yet — degrade cleanly
      }

      try {
        // Paid orders grouped by coupon: how often each coupon actually sold.
        const rows = await db
          .select({
            code: orders.couponCode,
            uses: sql<number>`count(*)`,
            revenue: sql<number>`coalesce(sum(${orders.amount}), 0)`,
          })
          .from(orders)
          .where(and(isNotNull(orders.couponCode), eq(orders.status, "paid")))
          .groupBy(orders.couponCode);
        couponStats = rows
          .filter((row) => row.code)
          .map((row) => ({
            code: row.code as string,
            uses: Number(row.uses),
            revenue: Number(row.revenue),
          }));
      } catch {
        // orders table unavailable — coupon stats stay empty
      }
    }

    if (canCatalog) {
      try {
        const subsAgg = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(subscribers)
          .where(and(isNotNull(subscribers.confirmedAt), isNull(subscribers.unsubscribedAt)));
        confirmedSubscriberCount = Number(subsAgg[0]?.count ?? 0);
      } catch {
        // newsletter table may not exist yet
      }
    }
  }

  const couponStatByCode = new Map(couponStats.map((stat) => [stat.code, stat]));

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan katalog, penjualan, dan antrean operasional.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/tools/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add tool
          </Link>
          <Link href="/admin/link-health" className="btn-secondary">
            <HeartPulse className="h-4 w-4" /> Link health
          </Link>
          <Link href="/admin/orders" className="btn-secondary">
            <Receipt className="h-4 w-4" /> Orders
          </Link>
        </div>
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
      {typeof sp.coupon_created === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Created promo coupon <code className="font-mono">{sp.coupon_created}</code>.
        </p>
      )}
      {typeof sp.coupon_error === "string" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {sp.coupon_error === "duplicate"
            ? "Coupon code already exists."
            : "Invalid coupon parameters (code min 3 chars, percent 1-95 or fixed > 0)."}
        </p>
      )}
      {typeof sp.coupon_updated === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Coupon updated.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wrench className="h-4 w-4" />}
          label="Tools"
          value={catalog.total.toLocaleString()}
          href="/admin/tools"
          hint="Kelola katalog →"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Needs review"
          value={needsReview}
          valueClassName={needsReview > 0 ? "text-warning" : ""}
          href="/admin/link-health"
          hint="Cek link & perbaiki →"
        />
        <StatCard
          icon={<Inbox className="h-4 w-4" />}
          label="Pending submissions"
          value={pending.length}
          href="/admin/submissions"
          hint="Review antrean →"
        />
        <StatCard
          icon={<Flag className="h-4 w-4" />}
          label="Open reports"
          value={openFeedback.length}
          valueClassName={openFeedback.length > 0 ? "text-warning" : ""}
          href="/admin/feedback"
          hint="Tindak lanjuti laporan →"
        />
      </div>

      {/* Monetization & Growth overview */}
      {(canBilling || canCatalog) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {canBilling && (
            <>
              <div className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Revenue (Net)</p>
                  <span className="rounded-lg bg-success/10 p-1.5 text-success">
                    <Wallet className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-success">{formatIdr(totalRevenueIdr)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{paidOrdersCount} paid order(s) · net of refunds</p>
              </div>
              <div className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending Orders</p>
                  <span className="rounded-lg bg-warning/10 p-1.5 text-warning">
                    <Clock className="h-4 w-4" />
                  </span>
                </div>
                <p className={`mt-2 text-2xl font-bold ${pendingOrdersCount > 0 ? "text-warning" : ""}`}>
                  {pendingOrdersCount}
                </p>
                <form action={reconcileOrdersAction} className="mt-2">
                  <button type="submit" className="text-xs font-medium text-accent hover:underline">
                    Reconcile with DOKU now →
                  </button>
                </form>
              </div>
            </>
          )}
          {canCatalog && (
            <div className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Newsletter Subscribers</p>
                <span className="rounded-lg bg-accent-soft p-1.5 text-accent">
                  <Mail className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold">{confirmedSubscriberCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Confirmed double opt-in</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-3 p-3 transition hover:border-accent/40 hover:bg-muted/40"
          >
            <span className="rounded-lg bg-accent-soft p-2 text-accent">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">{label}</span>
            <span className="ml-auto text-muted-foreground">→</span>
          </Link>
        ))}
      </div>

      {/* Manual Pro Grant + Recent Orders (owner/billing only) */}
      {canBilling && (
        <>
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

      {/* Promo Coupons Management */}
      <div className="card mt-8 p-5">
        <h2 className="font-semibold">Promo Coupons</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Create percentage or fixed IDR discount codes without redeploying. Validated automatically at checkout.
        </p>
        <form action={createCouponAction} className="mt-4 grid gap-2 sm:grid-cols-6">
          <input
            name="code"
            required
            placeholder="Code (e.g. LAUNCH20)"
            className="input font-mono text-xs uppercase"
          />
          <select name="discountType" className="input text-xs" defaultValue="percent">
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed (IDR)</option>
          </select>
          <input
            name="discountValue"
            type="number"
            min={1}
            required
            placeholder="Value (e.g. 20)"
            className="input text-xs"
          />
          <input
            name="maxUses"
            type="number"
            min={1}
            placeholder="Max uses (opt)"
            className="input text-xs"
          />
          <input
            name="expiresAt"
            type="date"
            aria-label="Expires at"
            className="input text-xs"
          />
          <button type="submit" className="btn-primary text-xs">
            Create Coupon
          </button>
        </form>

        {allCoupons.length > 0 && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {allCoupons.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <code className="font-mono text-accent">{c.code}</code>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                      {c.discountType === "percent" ? `${c.discountValue}%` : formatIdr(c.discountValue)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        c.active ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      {c.active ? "active" : "paused"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Used {c.usedCount}
                    {c.maxUses != null ? `/${c.maxUses}` : "×"}
                    {c.expiresAt ? ` · Expires ${formatDate(c.expiresAt)}` : ""}
                    {couponStatByCode.get(c.code)
                      ? ` · ${couponStatByCode.get(c.code)!.uses} order lunas · ${formatIdr(
                          couponStatByCode.get(c.code)!.revenue,
                        )}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/admin/orders?coupon=${encodeURIComponent(c.code)}`}
                    className="btn-secondary !px-2.5 !py-1 text-xs"
                  >
                    Orders
                  </Link>
                  <form action={toggleCouponAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={c.active ? "0" : "1"} />
                    <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                      {c.active ? "Pause" : "Activate"}
                    </button>
                  </form>
                  <form action={deleteCouponAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs text-destructive">
                      Delete
                    </button>
                  </form>
                </div>
                <details className="w-full basis-full text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Edit kupon
                  </summary>
                  <form action={updateCouponAction} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <select
                      name="discountType"
                      defaultValue={c.discountType}
                      className="input !w-auto !py-1 text-xs"
                    >
                      <option value="percent">Percent (%)</option>
                      <option value="fixed">Fixed (IDR)</option>
                    </select>
                    <input
                      name="discountValue"
                      type="number"
                      min={1}
                      defaultValue={c.discountValue}
                      className="input !w-24 !py-1 text-xs"
                    />
                    <input
                      name="maxUses"
                      type="number"
                      min={1}
                      defaultValue={c.maxUses ?? ""}
                      placeholder="max uses"
                      className="input !w-24 !py-1 text-xs"
                    />
                    <input
                      name="expiresAt"
                      type="date"
                      defaultValue={
                        c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : ""
                      }
                      className="input !w-auto !py-1 text-xs"
                    />
                    <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                      Save
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
        </>
      )}

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
