import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import {
  createSubcategoryAction,
  deleteSubcategoryAction,
  updateCategoryAction,
  updateSubcategoryAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const catalog = getCatalog();
  const subsByCategory = new Map<number, typeof catalog.subcategories>();
  for (const sub of catalog.subcategories) {
    const list = subsByCategory.get(sub.categoryId) ?? [];
    list.push(sub);
    subsByCategory.set(sub.categoryId, list);
  }

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kategori</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit nama/deskripsi/ikon/urutan kategori dan subkategori. Perubahan tersimpan di
          database; <code className="rounded bg-muted px-1 py-0.5">db:seed --reset</code> akan
          mengembalikannya ke data seed.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "saved" && "Kategori diperbarui."}
          {sp.ok === "sub_created" && "Subkategori dibuat."}
          {sp.ok === "sub_updated" && "Subkategori diperbarui."}
          {sp.ok === "sub_deleted" && "Subkategori dihapus."}
        </p>
      )}
      {sp.error === "sub_in_use" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Subkategori masih dipakai tool — pindahkan tool-nya dulu sebelum menghapus.
        </p>
      )}
      {sp.error === "validation" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Input tidak valid (nama wajib).
        </p>
      )}

      <div className="mt-6 space-y-4">
        {catalog.categories.map((cat) => {
          const subs = (subsByCategory.get(cat.id) ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
          return (
            <div key={cat.id} className="card p-5">
              <form action={updateCategoryAction} className="grid gap-3 lg:grid-cols-12">
                <input type="hidden" name="id" value={cat.id} />
                <label className="lg:col-span-4">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Nama</span>
                  <input name="name" defaultValue={cat.name} required className="input text-sm" />
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {cat.slug} · {cat.toolCount} tool
                  </span>
                </label>
                <label className="lg:col-span-4">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Deskripsi</span>
                  <input name="description" defaultValue={cat.description} className="input text-sm" />
                </label>
                <label className="lg:col-span-2">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Icon (lucide)</span>
                  <input name="icon" defaultValue={cat.icon} className="input text-sm" />
                </label>
                <label className="lg:col-span-1">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Sort</span>
                  <input name="sortOrder" type="number" defaultValue={cat.sortOrder} className="input text-sm" />
                </label>
                <label className="lg:col-span-1">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Home</span>
                  <input
                    name="homeOrder"
                    type="number"
                    defaultValue={cat.homeOrder ?? ""}
                    placeholder="—"
                    className="input text-sm"
                  />
                </label>
                <div className="lg:col-span-12 flex justify-end">
                  <button type="submit" className="btn-secondary !px-3 !py-1 text-xs">Simpan kategori</button>
                </div>
              </form>

              <div className="mt-4 border-t border-border pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Subkategori ({subs.length})
                </h3>
                <ul className="mt-2 space-y-2">
                  {subs.length === 0 && (
                    <li className="text-xs text-muted-foreground">Belum ada subkategori.</li>
                  )}
                  {subs.map((sub) => (
                    <li key={sub.id} className="flex flex-wrap items-center gap-2">
                      <form action={updateSubcategoryAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={sub.id} />
                        <input name="name" defaultValue={sub.name} className="input !w-48 !py-1 text-xs" />
                        <input
                          name="sortOrder"
                          type="number"
                          defaultValue={sub.sortOrder}
                          className="input !w-16 !py-1 text-xs"
                        />
                        <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">Save</button>
                      </form>
                      <form action={deleteSubcategoryAction}>
                        <input type="hidden" name="id" value={sub.id} />
                        <button type="submit" className="text-xs text-destructive hover:underline">
                          Hapus
                        </button>
                      </form>
                      <span className="text-[10px] text-muted-foreground">{sub.slug}</span>
                    </li>
                  ))}
                </ul>

                <form action={createSubcategoryAction} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <input
                    name="name"
                    required
                    placeholder="Nama subkategori baru"
                    className="input !w-56 !py-1 text-xs"
                  />
                  <input
                    name="sortOrder"
                    type="number"
                    placeholder="Sort"
                    className="input !w-20 !py-1 text-xs"
                  />
                  <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">+ Tambah</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
