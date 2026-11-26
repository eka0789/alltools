import { redirect } from "next/navigation";
import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { searchQueries, toolClicks } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { noResultQueries, trendingQueries } from "@/lib/search-analytics";
import { getCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = [7, 30, 90];

function sinceFor(days: number): number {
  return Date.now() - days * DAY_MS;
}

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
  }

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
