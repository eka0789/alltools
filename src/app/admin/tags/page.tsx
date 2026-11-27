import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { deleteTagAction, renameTagAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const catalog = getCatalog();
  const counts = new Map<string, number>();
  for (const tool of catalog.tools) {
    for (const tag of tool.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const tags = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tags.length} tag dari {catalog.tools.length} tool. Rename ke tag yang sudah ada = merge.
          Perubahan langsung ditulis ke semua tool terkait.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok.startsWith("renamed-") && `Tag di-rename pada ${sp.ok.slice(8)} tool.`}
          {sp.ok.startsWith("deleted-") && `Tag dihapus dari ${sp.ok.slice(8)} tool.`}
        </p>
      )}
      {sp.error === "validation" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Tag asal/tujuan tidak valid atau sama.
        </p>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Tools</th>
              <th className="px-4 py-3 text-right">Rename / hapus</th>
            </tr>
          </thead>
          <tbody>
            {tags.slice(0, 300).map(([tag, count]) => (
              <tr key={tag} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">{tag}</td>
                <td className="px-4 py-2.5 text-xs">{count}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <form action={renameTagAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="from" value={tag} />
                      <input
                        name="to"
                        required
                        placeholder="tag baru"
                        className="input !w-36 !py-1 font-mono text-xs"
                      />
                      <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                        Rename
                      </button>
                    </form>
                    <form action={deleteTagAction}>
                      <input type="hidden" name="tag" value={tag} />
                      <button type="submit" className="text-xs text-destructive hover:underline">
                        Hapus
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
