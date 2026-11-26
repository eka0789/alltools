import { redirect } from "next/navigation";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { aiUsage, users } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Kept outside the component body so the render-purity lint rule does not
// treat the clock read as unstable render output.
function usageWindows() {
  const now = Date.now();
  return { last7: now - 7 * DAY_MS, last30: now - 30 * DAY_MS };
}

export default async function AiUsagePage() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const { last7, last30 } = usageWindows();

  let total = 0;
  let last7Count = 0;
  let last30Count = 0;
  let anonCount = 0;
  let kinds: { kind: string; n: number }[] = [];
  let topUsers: { email: string | null; n: number }[] = [];

  if (DB_ACTIVE) {
    try {
      const [all, w7, w30, anon, kindRows, topRows] = await Promise.all([
        db.select({ n: sql<number>`count(*)` }).from(aiUsage),
        db.select({ n: sql<number>`count(*)` }).from(aiUsage).where(gte(aiUsage.createdAt, last7)),
        db.select({ n: sql<number>`count(*)` }).from(aiUsage).where(gte(aiUsage.createdAt, last30)),
        db
          .select({ n: sql<number>`count(*)` })
          .from(aiUsage)
          .where(sql`${aiUsage.userId} IS NULL`),
        db
          .select({ kind: aiUsage.kind, n: sql<number>`count(*)` })
          .from(aiUsage)
          .where(gte(aiUsage.createdAt, last30))
          .groupBy(aiUsage.kind),
        db
          .select({ email: users.email, n: sql<number>`count(*)` })
          .from(aiUsage)
          .leftJoin(users, eq(users.id, aiUsage.userId))
          .where(and(gte(aiUsage.createdAt, last30), isNotNull(aiUsage.userId)))
          .groupBy(aiUsage.userId, users.email)
          .orderBy(desc(sql`count(*)`))
          .limit(10),
      ]);
      total = Number(all[0]?.n ?? 0);
      last7Count = Number(w7[0]?.n ?? 0);
      last30Count = Number(w30[0]?.n ?? 0);
      anonCount = Number(anon[0]?.n ?? 0);
      kinds = kindRows.map((k) => ({ kind: k.kind, n: Number(k.n) }));
      topUsers = topRows.map((u) => ({ email: u.email, n: Number(u.n) }));
    } catch {
      // ai_usage table missing — show zeros
    }
  }

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pemakaian AI code review (kuota, pengguna aktif, anonim vs terdaftar).
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total review</p>
          <p className="mt-1 text-2xl font-bold">{total.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">7 hari</p>
          <p className="mt-1 text-2xl font-bold">{last7Count.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">30 hari</p>
          <p className="mt-1 text-2xl font-bold">{last30Count.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Anonim</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">{anonCount.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Per jenis (30 hari)</h2>
          {kinds.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Belum ada data.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {kinds.map((k) => (
                <li key={k.kind} className="flex items-center justify-between">
                  <span className="font-mono text-xs">{k.kind}</span>
                  <span className="text-xs text-muted-foreground">{k.n.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Top pengguna (30 hari)</h2>
          {topUsers.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Belum ada pengguna terdaftar yang memakai AI review.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topUsers.map((u, i) => (
                <li key={`${u.email}-${i}`} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{u.email ?? "—"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{u.n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Kuota: anonim 3/hari · free 5/hari · pro 200/hari (lihat{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">src/lib/quota.ts</code>).
      </p>
    </div>
  );
}
