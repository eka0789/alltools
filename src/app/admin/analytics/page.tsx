import { redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { orders, searchQueries, submissions, toolClicks, toolImpressions } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { noResultQueries, trendingQueries } from "@/lib/search-analytics";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = [7, 30, 90];

function sinceFor(days: number): number {
  return Date.now() - days * DAY_MS;
}

function dayKeys(days: number): string[] {
  const now = Date.now();
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10));
  }
  return keys;
}

function Bars({
  title,
  keys,
  data,
  tone,
}: {
  title: string;
  keys: string[];
  data: Record<string, number>;
  tone: string;
}) {
  const max = Math.max(1, ...keys.map((key) => data[key] ?? 0));
  const total = keys.reduce((sum, key) => sum + (data[key] ?? 0), 0);
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="mt-2 flex h-16 items-end gap-0.5">
        {keys.map((key) => {
          const value = data[key] ?? 0;
          return (
            <div
              key={key}
              title={`${key}: ${value}`}
              className={`flex-1 rounded-sm ${tone}`}
              style={{
                height: `${Math.max(3, (value / max) * 100)}%`,
                opacity: value ? 1 : 0.12,
              }}
            />
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {keys[0]} → {keys[keys.length - 1]} · total {total}
      </p>
    </div>
  );
}

const FUNNEL_ORDER = ["pending", "paid", "refunded", "expired", "failed"];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const since = sinceFor(days);

  const [top, zero] = await Promise.all([
    trendingQueries(days, 50),
    noResultQueries(days, 50),
  ]);

  const catalog = getCatalog();
  let clicks: { slug: string; clicks: number; weeklyClicks: number }[] = [];
  let totals = { searches: 0, zeroResult: 0 };
  let series: {
    paidOrders: Record<string, number>;
    searches: Record<string, number>;
    submissions: Record<string, number>;
  } = { paidOrders: {}, searches: {}, submissions: {} };
  let funnel: { status: string; n: number }[] = [];
  let impressions: { slug: string; n: number }[] = [];
  const keys = dayKeys(days);

  if (DB_ACTIVE) {
    try {
      clicks = await db
        .select({
          slug: toolClicks.slug,
          clicks: toolClicks.clicks,
          weeklyClicks: toolClicks.weeklyClicks,
        })
        .from(toolClicks)
        .orderBy(desc(toolClicks.weeklyClicks), desc(toolClicks.clicks))
        .limit(50);
    } catch {
      clicks = [];
    }
    try {
      const [searchCount, zeroCount] = await Promise.all([
        db
          .select({ n: sql<number>`count(*)` })
          .from(searchQueries)
          .where(gte(searchQueries.createdAt, since)),
        db
          .select({ n: sql<number>`count(*)` })
          .from(searchQueries)
          .where(and(gte(searchQueries.createdAt, since), eq(searchQueries.resultCount, 0))),
      ]);
      totals = {
        searches: Number(searchCount[0]?.n ?? 0),
        zeroResult: Number(zeroCount[0]?.n ?? 0),
      };
    } catch {
      totals = { searches: 0, zeroResult: 0 };
    }
    try {
      const dayExpr = (column: unknown) => sql<string>`date(${column} / 1000, 'unixepoch')`;
      const [paidRows, searchRows, submissionRows, funnelRows] = await Promise.all([
        db
          .select({ day: dayExpr(orders.createdAt), n: sql<number>`count(*)` })
          .from(orders)
          .where(and(gte(orders.createdAt, since), eq(orders.status, "paid")))
          .groupBy(dayExpr(orders.createdAt)),
        db
          .select({ day: dayExpr(searchQueries.createdAt), n: sql<number>`count(*)` })
          .from(searchQueries)
          .where(gte(searchQueries.createdAt, since))
          .groupBy(dayExpr(searchQueries.createdAt)),
        db
          .select({ day: dayExpr(submissions.createdAt), n: sql<number>`count(*)` })
          .from(submissions)
          .where(gte(submissions.createdAt, since))
          .groupBy(dayExpr(submissions.createdAt)),
        db
          .select({ status: orders.status, n: sql<number>`count(*)` })
          .from(orders)
          .where(gte(orders.createdAt, since))
          .groupBy(orders.status),
      ]);
      const toMap = (rows: { day: string; n: number }[]) =>
        Object.fromEntries(rows.map((row) => [row.day, Number(row.n)]));
      series = {
        paidOrders: toMap(paidRows),
        searches: toMap(searchRows),
        submissions: toMap(submissionRows),
      };
      funnel = funnelRows.map((row) => ({ status: row.status, n: Number(row.n) }));
      const impressionRows = await db
        .select({
          slug: toolImpressions.slug,
          n: sql<number>`sum(${toolImpressions.count})`,
        })
        .from(toolImpressions)
        .where(gte(toolImpressions.day, keys[0]))
        .groupBy(toolImpressions.slug);
      impressions = impressionRows.map((row) => ({ slug: row.slug, n: Number(row.n) }));
    } catch {
      series = { paidOrders: {}, searches: {}, submissions: {} };
      funnel = [];
      impressions = [];
    }
  }

  const clickBySlug = new Map(clicks.map((row) => [row.slug, row]));
  const quality = impressions
    .map((row) => {
      const clickRow = clickBySlug.get(row.slug);
      // Clicks are all-time counters; impressions are range-scoped, so this
      // CTR is an indicator (labelled as approximate), not an exact ratio.
      const clickCount = clickRow?.clicks ?? 0;
      return {
        slug: row.slug,
        name: catalog.bySlug.get(row.slug)?.name ?? row.slug,
        impressions: row.n,
        clicks: clickCount,
        ctr: row.n > 0 ? clickCount / row.n : 0,
      };
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);
  const shelfWare = quality.filter((row) => row.impressions >= 20 && row.clicks === 0);
  const totalImpressions = impressions.reduce((sum, row) => sum + row.n, 0);
  const totalClicks = clicks.reduce((sum, row) => sum + row.clicks, 0);
  const overallCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Query pencarian anonim + klik keluar. Zero-result queries adalah roadmap kurasi termurah.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href="/admin/export?type=searches" className="btn-secondary">Searches CSV</a>
          <a href="/admin/export?type=clicks" className="btn-secondary">Clicks CSV</a>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rentang:</span>
        {RANGES.map((range) => (
          <Link
            key={range}
            href={`/admin/analytics?days=${range}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              days === range
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {range} hari
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Searches</p>
          <p className="mt-1 text-2xl font-bold">{totals.searches.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Zero-result</p>
          <p className={`mt-1 text-2xl font-bold ${totals.zeroResult > 0 ? "text-warning" : ""}`}>
            {totals.zeroResult.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Tools dengan klik</p>
          <p className="mt-1 text-2xl font-bold">{clicks.length}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Bars title="Order lunas / hari" keys={keys} data={series.paidOrders} tone="bg-success" />
        <Bars title="Searches / hari" keys={keys} data={series.searches} tone="bg-accent" />
        <Bars title="Submissions / hari" keys={keys} data={series.submissions} tone="bg-warning" />
      </div>

      <div className="card mt-4 p-5">
        <h2 className="font-semibold">Funnel order ({days} hari)</h2>
        {funnel.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Belum ada order pada rentang ini.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {FUNNEL_ORDER.map((status) => {
              const total = funnel.reduce((sum, row) => sum + row.n, 0);
              const n = funnel.find((row) => row.status === status)?.n ?? 0;
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              return (
                <span key={status} className="text-xs">
                  <span className="font-semibold">{status}</span> {n}{" "}
                  <span className="text-muted-foreground">({pct}%)</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Impressions</p>
          <p className="mt-1 text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">tool page views, {days} hari</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Shelf-ware</p>
          <p className={`mt-1 text-2xl font-bold ${shelfWare.length > 0 ? "text-warning" : ""}`}>
            {shelfWare.length}
          </p>
          <p className="text-[10px] text-muted-foreground">≥20 impresi, 0 klik</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">CTR keseluruhan</p>
          <p className="mt-1 text-2xl font-bold">{(overallCtr * 100).toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">klik all-time ÷ impresi periode</p>
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <div className="px-4 pt-4">
          <h2 className="font-semibold">Kualitas katalog — impresi &amp; CTR</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            CTR = klik keluar all-time ÷ impresi pada periode. Shelf-ware = banyak dilihat, tidak
            pernah diklik.
          </p>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Tool</th>
              <th className="px-4 py-2 text-right">Impresi</th>
              <th className="px-4 py-2 text-right">Klik</th>
              <th className="px-4 py-2 text-right">CTR</th>
              <th className="px-4 py-2">Sinyal</th>
            </tr>
          </thead>
          <tbody>
            {quality.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Belum ada impresi. Beacon aktif di halaman tool — data akan muncul seiring traffic.
                </td>
              </tr>
            ) : (
              quality.map((row) => (
                <tr key={row.slug} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/tools/${row.slug}`} className="font-medium hover:text-accent">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right text-xs">{row.impressions.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-xs">{row.clicks.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-xs">
                    {(row.ctr * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {row.clicks === 0 && row.impressions >= 20 ? (
                      <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">
                        shelf-ware
                      </span>
                    ) : row.ctr >= 0.2 ? (
                      <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] text-success">
                        CTR tinggi
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Top queries</h2>
          {top.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Belum ada data untuk rentang ini.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {top.map((s) => (
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

        <div className="card p-5">
          <h2 className="font-semibold">Zero results — peluang kurasi</h2>
          {zero.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Semua pencarian menemukan sesuatu.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {zero.map((s) => (
                <li key={s.query} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-warning">{s.query}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{s.hits}×</span>
                    <Link
                      href={`/admin/tools/new?name=${encodeURIComponent(s.query)}`}
                      className="text-[11px] text-accent hover:underline"
                    >
                      + tool
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <h2 className="font-semibold">Most opened tools</h2>
          <span className="text-xs text-muted-foreground">weekly first</span>
        </div>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Tool</th>
              <th className="px-4 py-2 text-right">This week</th>
              <th className="px-4 py-2 text-right">All-time</th>
            </tr>
          </thead>
          <tbody>
            {clicks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Belum ada klik keluar yang tercatat.
                </td>
              </tr>
            ) : (
              clicks.map((c, i) => {
                const tool = catalog.bySlug.get(c.slug);
                return (
                  <tr key={c.slug} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2">
                      {tool ? (
                        <Link href={`/tools/${c.slug}`} className="font-medium hover:text-accent">
                          {tool.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{c.slug}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs">{c.weeklyClicks}</td>
                    <td className="px-4 py-2 text-right text-xs">{c.clicks}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
