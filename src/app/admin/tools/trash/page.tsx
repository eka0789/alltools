import Link from "next/link";
import { redirect } from "next/navigation";
import { isNotNull, desc } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { tools } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { purgeToolAction, restoreToolAction } from "../../actions";
import { ConfirmDeleteButton } from "../confirm-delete-button";

export const dynamic = "force-dynamic";

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;

  let rows: {
    id: number;
    name: string;
    slug: string;
    url: string;
    deletedAt: number | null;
  }[] = [];

  if (DB_ACTIVE) {
    try {
      rows = await db
        .select({ id: tools.id, name: tools.name, slug: tools.slug, url: tools.url, deletedAt: tools.deletedAt })
        .from(tools)
        .where(isNotNull(tools.deletedAt))
        .orderBy(desc(tools.deletedAt))
        .limit(300);
    } catch {
      rows = [];
    }
  }

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trash</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tool yang dihapus berhenti tampil di katalog publik tetapi tetap bisa
            dipulihkan. Hapus permanen hanya bila yakin.
          </p>
        </div>
        <Link href="/admin/tools" className="btn-secondary">
          ← Manage tools
        </Link>
      </div>

      {sp.restored && (
        <p className="mt-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
          Tool dipulihkan dan kembali tampil di katalog.
        </p>
      )}
      {sp.purged && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Tool dihapus permanen.
        </p>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Tool</th>
              <th className="px-4 py-3">Deleted</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Trash kosong.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{t.slug}</span>
                    <span className="block max-w-[320px] truncate text-[11px] text-muted-foreground">
                      {t.url}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {t.deletedAt ? new Date(t.deletedAt).toLocaleString("en-GB") : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <form action={restoreToolAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                          Restore
                        </button>
                      </form>
                      <form action={purgeToolAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmDeleteButton name={t.name} permanent />
                      </form>
                    </div>
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
