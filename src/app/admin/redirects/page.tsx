import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { redirects, type Redirect } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatDate } from "@/lib/slug";
import { createRedirectAction, deleteRedirectAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RedirectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;

  let rows: Redirect[] = [];
  if (DB_ACTIVE) {
    try {
      rows = await db.select().from(redirects).orderBy(desc(redirects.createdAt)).limit(300);
    } catch {
      rows = [];
    }
  }

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Redirects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Redirect 301 internal. Slug tool yang diubah otomatis tercatat di sini agar backlink
          dan SEO tidak putus.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "created" && "Redirect disimpan."}
          {sp.ok === "deleted" && "Redirect dihapus."}
        </p>
      )}
      {sp.error === "validation" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Path harus diawali “/” (contoh: /tools/nama-lama).
        </p>
      )}

      <form action={createRedirectAction} className="card mt-6 flex flex-wrap items-end gap-2 p-4">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
            Dari path
          </span>
          <input name="fromPath" required placeholder="/tools/old-slug" className="input text-sm" />
        </label>
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
            Ke path
          </span>
          <input name="toPath" required placeholder="/tools/new-slug" className="input text-sm" />
        </label>
        <button type="submit" className="btn-primary text-xs">Tambah</button>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Dari</th>
              <th className="px-4 py-3">Ke</th>
              <th className="px-4 py-3">Hits</th>
              <th className="px-4 py-3">Dibuat</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada redirect.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{row.fromPath}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-accent">{row.toPath}</td>
                  <td className="px-4 py-2.5 text-xs">{row.hits}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteRedirectAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <button type="submit" className="btn-secondary !px-2 !py-1 text-xs text-destructive">
                        Hapus
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
