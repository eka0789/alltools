import { redirect } from "next/navigation";
import { GLOSSARY, GLOSSARY_CATEGORY_ORDER } from "@/data/glossary";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { listGlossaryRows } from "@/lib/managed-content";
import { deleteGlossaryAction, upsertGlossaryAction } from "./actions";

export const dynamic = "force-dynamic";

function jsonList(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.join(", ") : "";
  } catch {
    return "";
  }
}

function Fields({ row }: { row?: { term: string; slug: string; category: string; short: string; definition: string; example: string | null; relatedTools: string; relatedTerms: string; active: boolean } }) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="term" required defaultValue={row?.term} placeholder="Istilah" className="input text-sm" />
        <input name="slug" defaultValue={row?.slug} placeholder="slug (auto)" className="input text-sm" />
        <select name="category" defaultValue={row?.category ?? "Web & API"} className="input text-sm">
          {GLOSSARY_CATEGORY_ORDER.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" name="active" defaultChecked={row?.active ?? true} className="h-4 w-4" />
          aktif
        </label>
      </div>
      <input name="short" required defaultValue={row?.short} placeholder="Definisi singkat (1 baris)" className="input text-sm" />
      <textarea name="definition" required rows={4} defaultValue={row?.definition} placeholder="Definisi lengkap" className="input text-sm" />
      <input name="example" defaultValue={row?.example ?? ""} placeholder="Contoh (opsional)" className="input text-sm" />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="relatedTools" defaultValue={row ? jsonList(row.relatedTools) : ""} placeholder="Slug tool terkait" className="input font-mono text-xs" />
        <input name="relatedTerms" defaultValue={row ? jsonList(row.relatedTerms) : ""} placeholder="Slug istilah terkait" className="input font-mono text-xs" />
      </div>
    </>
  );
}

export default async function GlossaryAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const rows = await listGlossaryRows();

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Glossary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {GLOSSARY.length} istilah bawaan (kode) · {rows.length} entri DB. Slug sama menimpa versi
          kode; slug baru muncul di /glossary.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "saved" && "Istilah disimpan."}
          {sp.ok === "deleted" && "Entri DB dihapus."}
        </p>
      )}
      {sp.error === "validation" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Istilah, definisi singkat, definisi, dan kategori wajib valid.
        </p>
      )}

      <form action={upsertGlossaryAction} className="card mt-6 space-y-3 p-5">
        <h2 className="font-semibold">Tambah / override istilah</h2>
        <Fields />
        <div className="flex justify-end">
          <button type="submit" className="btn-primary text-xs">Simpan</button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <details key={row.id} className="card p-4">
            <summary className="cursor-pointer">
              <span className="font-medium">{row.term}</span>
              <span className="ml-2 text-xs text-muted-foreground">{row.category}</span>
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">{row.slug}</span>
              {!row.active && (
                <span className="ml-2 rounded bg-warning/15 px-2 py-0.5 text-[10px] text-warning">nonaktif</span>
              )}
            </summary>
            <form action={upsertGlossaryAction} className="mt-3 space-y-3">
              <Fields row={row} />
              <div className="flex justify-end">
                <button type="submit" className="btn-primary !px-3 !py-1 text-xs">Simpan</button>
              </div>
            </form>
            <form action={deleteGlossaryAction} className="mt-2 flex justify-end">
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
