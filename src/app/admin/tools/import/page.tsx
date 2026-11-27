import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { importToolsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ImportToolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const catalog = getCatalog();

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import tools (CSV)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tempel CSV di bawah. Baris duplikat (URL sama) dilewati otomatis; baris tidak valid
            dihitung tanpa menyimpan.
          </p>
        </div>
        <Link href="/admin/tools" className="btn-secondary">← Manage tools</Link>
      </div>

      {typeof sp.done === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.dry === "1" ? "Dry run (tidak ada yang disimpan): " : "Import selesai: "}
          {sp.done.replace("created-", "").replace("-skipped-", " dibuat · ").replace("-invalid-", " dilewati · ")} tidak valid.
        </p>
      )}
      {sp.error === "empty" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          CSV kosong.
        </p>
      )}

      <div className="card mt-6 p-5">
        <h2 className="font-semibold">Format kolom</h2>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
{`name,url,description,category,pricing,tags
Raycast,https://raycast.com,Launcher for your tools,productivity,freemium,launcher|macos
Another Tool,https://example.com,Short description,development-tools,free,cli|open-source`}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Kolom <code className="rounded bg-muted px-1 py-0.5">category</code> harus slug kategori
          yang ada (contoh: {catalog.categories.slice(0, 4).map((c) => c.slug).join(", ")}…).
          Tags dipisah <code className="rounded bg-muted px-1 py-0.5">|</code>. Header opsional.
        </p>
      </div>

      <form action={importToolsAction} className="card mt-4 space-y-4 p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Data CSV</span>
          <textarea
            name="csv"
            rows={12}
            required
            placeholder="name,url,description,category,pricing,tags"
            className="input font-mono text-xs"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" name="dryRun" className="h-4 w-4" />
            Dry run — preview jumlah tanpa menyimpan
          </label>
          <button type="submit" className="btn-primary">Import</button>
        </div>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        Untuk export data yang ada, gunakan{" "}
        <a href="/admin/export?type=tools" className="text-accent hover:underline">
          Download tools CSV
        </a>
        .
      </p>
    </div>
  );
}
