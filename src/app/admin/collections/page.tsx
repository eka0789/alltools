import { redirect } from "next/navigation";
import { COLLECTIONS } from "@/data/collections";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { listCollectionRows } from "@/lib/managed-content";
import { deleteCollectionAction, upsertCollectionAction } from "./actions";

export const dynamic = "force-dynamic";

function toolList(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.join(", ") : "";
  } catch {
    return "";
  }
}

function Fields({
  id,
  row,
}: {
  id?: string;
  row?: {
    slug: string;
    title: string;
    tagline: string;
    description: string;
    emoji: string;
    tools: string;
    sortOrder: number;
    active: boolean;
  };
}) {
  return (
    <>
      {id && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="title" required defaultValue={row?.title} placeholder="Judul" className="input text-sm" />
        <input name="slug" defaultValue={row?.slug} placeholder="slug (auto dari judul)" className="input text-sm" />
        <input name="tagline" defaultValue={row?.tagline} placeholder="Tagline" className="input text-sm" />
        <input name="emoji" defaultValue={row?.emoji ?? "📦"} placeholder="Emoji" className="input text-sm" />
      </div>
      <textarea
        name="description"
        rows={2}
        defaultValue={row?.description}
        placeholder="Deskripsi"
        className="input text-sm"
      />
      <textarea
        name="tools"
        rows={2}
        defaultValue={row ? toolList(row.tools) : ""}
        placeholder="Slug tool, pisahkan koma atau baris baru"
        className="input font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted-foreground">
          Sort{" "}
          <input
            name="sortOrder"
            type="number"
            defaultValue={row?.sortOrder ?? 0}
            className="input ml-1 !w-20 !py-1 text-xs"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" name="active" defaultChecked={row?.active ?? true} className="h-4 w-4" />
          aktif
        </label>
      </div>
    </>
  );
}

export default async function CollectionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const rows = await listCollectionRows();

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {COLLECTIONS.length} koleksi bawaan (kode) · {rows.length} entri DB. Entri DB dengan slug
          yang sama menimpa versi kode; slug baru ditambahkan ke halaman publik.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "saved" && "Collection disimpan."}
          {sp.ok === "deleted" && "Entri DB dihapus (koleksi kode kembali tampil jika ada)."}
        </p>
      )}
      {sp.error === "validation" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Judul wajib diisi.
        </p>
      )}

      <form action={upsertCollectionAction} className="card mt-6 space-y-3 p-5">
        <h2 className="font-semibold">Tambah / override collection</h2>
        <Fields />
        <div className="flex justify-end">
          <button type="submit" className="btn-primary text-xs">Simpan</button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <details key={row.id} className="card p-4">
            <summary className="cursor-pointer">
              <span className="font-medium">{row.title}</span>
              <span className="ml-2 font-mono text-xs text-muted-foreground">{row.slug}</span>
              {!row.active && (
                <span className="ml-2 rounded bg-warning/15 px-2 py-0.5 text-[10px] text-warning">nonaktif</span>
              )}
            </summary>
            <form action={upsertCollectionAction} className="mt-3 space-y-3">
              <Fields id={String(row.id)} row={row} />
              <div className="flex justify-end gap-2">
                <button type="submit" className="btn-primary !px-3 !py-1 text-xs">Simpan</button>
              </div>
            </form>
            <form action={deleteCollectionAction} className="mt-2 flex justify-end">
              <input type="hidden" name="id" value={row.id} />
              <button type="submit" className="text-xs text-destructive hover:underline">
                Hapus entri DB
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
