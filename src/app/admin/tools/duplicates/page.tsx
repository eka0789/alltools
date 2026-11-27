import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import type { ToolWithMeta } from "@/lib/data";
import { mergeToolsAction } from "./actions";

export const dynamic = "force-dynamic";

function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length >= 2 && !["the", "and", "for", "app", "tool"].includes(word)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

// Hosts that legitimately list many distinct projects under one domain.
const SHARED_HOSTS = new Set([
  "github.com",
  "www.github.com",
  "gitlab.com",
  "bitbucket.org",
  "npmjs.com",
  "www.npmjs.com",
  "pypi.org",
  "crates.io",
  "hub.docker.com",
]);

interface Pair {
  a: ToolWithMeta;
  b: ToolWithMeta;
  score: number;
  sameHost: boolean;
}

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;

  const tools = getCatalog().tools;
  const prepared = tools.map((tool) => ({
    tool,
    tokens: nameTokens(tool.name),
    host: hostOf(tool.url),
  }));

  const pairs: Pair[] = [];
  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const left = prepared[i];
      const right = prepared[j];
      const score = jaccard(left.tokens, right.tokens);
      const sameHost = Boolean(left.host && left.host === right.host);
      const suspiciousSameHost =
        sameHost && score >= 0.5 && !SHARED_HOSTS.has(left.host);
      if (score >= 0.8 || suspiciousSameHost) {
        pairs.push({ a: left.tool, b: right.tool, score, sameHost });
      }
    }
  }
  pairs.sort((x, y) => y.score - x.score);

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Potential Duplicates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deteksi kemiripan nama & domain (heuristik, bukan keputusan otomatis). Tinjau manual
          sebelum menggabungkan atau menghapus.
        </p>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {tools.length} tools dipindai · {pairs.length} pasangan perlu ditinjau
        {pairs.length > 60 ? " (menampilkan 60 teratas)" : ""}.
      </p>

      {sp.merged === "1" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Duplikat digabung: klik dijumlahkan, riwayat link check dipindah, slug lama di-redirect,
          dan duplikat dipindah ke trash (bisa dipulihkan).
        </p>
      )}
      {sp.error === "invalid" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Pilih dua tool yang berbeda.
        </p>
      )}
      {sp.error === "missing" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Tool tidak ditemukan.
        </p>
      )}

      {pairs.length === 0 ? (
        <p className="card mt-4 p-5 text-sm text-muted-foreground">
          Tidak ada duplikat yang mencurigakan. 
        </p>
      ) : (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Tool A</th>
                <th className="px-4 py-3">Tool B</th>
                <th className="px-4 py-3">Kemiripan</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pairs.slice(0, 60).map((pair) => (
                <tr key={`${pair.a.id}-${pair.b.id}`} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/tools/${pair.a.slug}`} className="font-medium hover:text-accent">
                      {pair.a.name}
                    </Link>
                    <span className="block text-[10px] text-muted-foreground">{pair.a.url}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/tools/${pair.b.slug}`} className="font-medium hover:text-accent">
                      {pair.b.name}
                    </Link>
                    <span className="block text-[10px] text-muted-foreground">{pair.b.url}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold ${pair.score >= 0.9 ? "text-warning" : "text-muted-foreground"}`}>
                      {Math.round(pair.score * 100)}%
                    </span>
                    {pair.sameHost && (
                      <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">same host</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap justify-end gap-2 text-xs">
                      <Link href={`/admin/tools/${pair.a.id}`} className="text-accent hover:underline">
                        Edit A
                      </Link>
                      <Link href={`/admin/tools/${pair.b.id}`} className="text-accent hover:underline">
                        Edit B
                      </Link>
                      <form action={mergeToolsAction}>
                        <input type="hidden" name="keepId" value={pair.a.id} />
                        <input type="hidden" name="mergeId" value={pair.b.id} />
                        <button type="submit" className="text-destructive hover:underline">
                          Keep A
                        </button>
                      </form>
                      <form action={mergeToolsAction}>
                        <input type="hidden" name="keepId" value={pair.b.id} />
                        <input type="hidden" name="mergeId" value={pair.a.id} />
                        <button type="submit" className="text-destructive hover:underline">
                          Keep B
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
