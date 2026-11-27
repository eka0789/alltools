import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { moveFeaturedAction, moveHomeCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

function MoveButtons({ id, kind }: { id: number; kind: "featured" | "category" }) {
  const action = kind === "featured" ? moveFeaturedAction : moveHomeCategoryAction;
  return (
    <div className="flex shrink-0 gap-1">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <button type="submit" className="btn-secondary !px-2 !py-0.5 text-xs" aria-label="Naik">
          ↑
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <button type="submit" className="btn-secondary !px-2 !py-0.5 text-xs" aria-label="Turun">
          ↓
        </button>
      </form>
    </div>
  );
}

export default async function CurationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const catalog = getCatalog();
  const featured = catalog.tools
    .filter((tool) => tool.featured)
    .sort(
      (a, b) =>
        (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.featuredOrder ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name),
    );
  const homeCategories = catalog.categories
    .filter((category) => category.homeOrder !== null)
    .sort((a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0));

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kurasi Homepage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Urutan “Editor&apos;s Picks” (featured) dan kategori di homepage. Homepage menampilkan 8
          featured pertama dan kategori sesuai urutan ini.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Urutan diperbarui.
        </p>
      )}
      {sp.error === "edge" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Sudah di urutan paling atas/bawah.
        </p>
      )}
      {sp.error === "invalid" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Permintaan tidak valid.
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Editor&apos;s Picks ({featured.length})</h2>
            <span className="text-[10px] text-muted-foreground">8 teratas tampil</span>
          </div>
          {featured.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Belum ada tool featured. Aktifkan lewat toggle ★ di Manage Tools.
            </p>
          ) : (
            <ol className="mt-3 space-y-1.5">
              {featured.map((tool, index) => (
                <li key={tool.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm">
                    <span className="mr-2 text-xs text-muted-foreground">{index + 1}.</span>
                    {tool.name}
                    <span className="ml-2 text-[10px] text-muted-foreground">{tool.categoryName}</span>
                  </span>
                  <MoveButtons id={tool.id} kind="featured" />
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Kategori di homepage ({homeCategories.length})</h2>
          {homeCategories.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Belum ada kategori dengan home order. Atur di halaman Kategori (kolom Home).
            </p>
          ) : (
            <ol className="mt-3 space-y-1.5">
              {homeCategories.map((category, index) => (
                <li key={category.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm">
                    <span className="mr-2 text-xs text-muted-foreground">{index + 1}.</span>
                    {category.name}
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {category.toolCount} tool
                    </span>
                  </span>
                  <MoveButtons id={category.id} kind="category" />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
