import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Plus, Trash2 } from "lucide-react";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { bulkToolAction, deleteToolAction, toggleFeaturedAction } from "../actions";
import { PricingBadge } from "@/components/tool-card";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { SelectAllCheckbox } from "./bulk-select";

export const dynamic = "force-dynamic";

// "Complete" means a curator filled in the three fields that make a tool page
// actually useful beyond a name+link: source repo, docs, and a copy-paste
// install command.
function missingFields(tool: {
  githubUrl: string | null;
  documentationUrl: string | null;
  installCommand: string | null;
}): string[] {
  const missing: string[] = [];
  if (!tool.githubUrl) missing.push("GitHub");
  if (!tool.documentationUrl) missing.push("Docs");
  if (!tool.installCommand) missing.push("Install");
  return missing;
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminToolsPage({ searchParams }: Props) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().toLowerCase();
  const status = String(sp.status ?? "");
  const category = String(sp.category ?? "");
  const featured = String(sp.featured ?? "");
  const verified = String(sp.verified ?? "");
  const completeness = String(sp.completeness ?? "");
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = 30;

  const catalog = getCatalog();
  const filtered = catalog.tools
    .filter((t) => {
      if (
        q &&
        !(
          t.name.toLowerCase().includes(q) ||
          t.slug.includes(q) ||
          t.url.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      if (status && t.status !== status) return false;
      if (category && t.categorySlug !== category) return false;
      if (featured === "yes" && !t.featured) return false;
      if (featured === "no" && t.featured) return false;
      if (verified === "yes" && !t.verified) return false;
      if (verified === "no" && t.verified) return false;
      const missing = missingFields(t);
      if (completeness === "incomplete" && missing.length === 0) return false;
      if (completeness === "complete" && missing.length > 0) return false;
      return true;
    })
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const slice = filtered.slice((page - 1) * perPage, page * perPage);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  if (featured) params.set("featured", featured);
  if (verified) params.set("verified", verified);
  if (completeness) params.set("completeness", completeness);
  const pageHref = (n: number) => `/admin/tools?${params.toString()}&page=${n}`;

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Tools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length.toLocaleString()} tools · halaman {page} dari {totalPages}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/admin/export?type=tools" className="btn-secondary">
            <Download className="h-4 w-4" /> CSV
          </a>
          <Link href="/admin/tools/import" className="btn-secondary">Import</Link>
          <Link href="/admin/tools/trash" className="btn-secondary">
            <Trash2 className="h-4 w-4" /> Trash
          </Link>
          <Link href="/admin/tools/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add tool
          </Link>
        </div>
      </div>

      {sp.saved && (
        <p className="mt-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
          Tool saved.
        </p>
      )}
      {sp.bulk && (
        <p className="mt-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
          Aksi massal diterapkan.
        </p>
      )}
      {sp.deleted && (
        <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Tool dipindahkan ke trash. Bisa dipulihkan dari halaman Trash.
        </p>
      )}
      {sp.error === "duplicate" && (
        <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Not saved: another tool already uses this website URL.
        </p>
      )}
      {sp.error === "subcategory" && (
        <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Not saved: the subcategory doesn&apos;t belong to the chosen category.
        </p>
      )}
      {sp.error === "bulk_empty" && (
        <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Pilih minimal satu tool dan satu aksi massal.
        </p>
      )}

      <form className="mt-5 flex flex-wrap items-end gap-2" action="/admin/tools">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search name, slug or URL…"
          className="input max-w-xs"
        />
        <select name="status" defaultValue={status} className="input !w-auto text-sm">
          <option value="">Semua status</option>
          <option value="active">active</option>
          <option value="needs_review">needs_review</option>
          <option value="deprecated">deprecated</option>
        </select>
        <select name="category" defaultValue={category} className="input !w-auto text-sm">
          <option value="">Semua kategori</option>
          {catalog.categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="featured" defaultValue={featured} className="input !w-auto text-sm">
          <option value="">Featured: semua</option>
          <option value="yes">Featured</option>
          <option value="no">Not featured</option>
        </select>
        <select name="verified" defaultValue={verified} className="input !w-auto text-sm">
          <option value="">Verified: semua</option>
          <option value="yes">Verified</option>
          <option value="no">Not verified</option>
        </select>
        <select name="completeness" defaultValue={completeness} className="input !w-auto text-sm">
          <option value="">Kelengkapan: semua</option>
          <option value="complete">Lengkap (docs + GitHub + install)</option>
          <option value="incomplete">Belum lengkap</option>
        </select>
        <button type="submit" className="btn-secondary">Filter</button>
        {(q || status || category || featured || verified || completeness) && (
          <Link href="/admin/tools" className="text-xs text-muted-foreground hover:underline">
            Reset
          </Link>
        )}
      </form>

      {completeness === "incomplete" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: centang semua di header tabel, lalu pilih <strong>Tandai belum lengkap</strong> di
          aksi massal untuk memasukkannya ke antrean review.
        </p>
      )}

      <form id="bulk-form" action={bulkToolAction} className="mt-4 flex flex-wrap items-center gap-2">
        <select name="bulkAction" defaultValue="" required className="input !w-auto text-sm">
          <option value="" disabled>
            Pilih aksi massal…
          </option>
          <option value="activate">Set aktif</option>
          <option value="needs_review">Tandai needs review</option>
          <option value="deprecate">Deprecate</option>
          <option value="feature">Feature</option>
          <option value="unfeature">Unfeature</option>
          <option value="verify">Tandai verified</option>
          <option value="unverify">Hapus verified</option>
          <option value="flag_incomplete">Tandai belum lengkap (needs review + unverify)</option>
          <option value="trash">Pindahkan ke trash</option>
        </select>
        <button type="submit" className="btn-primary text-xs">
          Terapkan ke terpilih
        </button>
        <span className="text-xs text-muted-foreground">Centang baris di tabel.</span>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-3">
                <SelectAllCheckbox formId="bulk-form" />
              </th>
              <th className="px-4 py-3">Tool</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Pricing</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Kelengkapan</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada tool untuk filter ini.
                </td>
              </tr>
            ) : (
              slice.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      name="ids"
                      value={t.id}
                      form="bulk-form"
                      className="h-4 w-4"
                      aria-label={`Select ${t.name}`}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{t.slug}</span>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block max-w-[240px] truncate text-[11px] text-accent hover:underline"
                    >
                      {t.url}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.categoryName}</td>
                  <td className="px-4 py-2.5">
                    <PricingBadge pricing={t.pricing} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`tag-badge ${
                        t.status === "needs_review" ? "!bg-warning/15 !text-warning" : ""
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {t.verified ? (
                      <span className="text-success">verified</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {(() => {
                      const missing = missingFields(t);
                      return missing.length === 0 ? (
                        <span className="text-[10px] font-semibold text-success">Lengkap</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {missing.map((field) => (
                            <span
                              key={field}
                              className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning"
                            >
                              tanpa {field}
                            </span>
                          ))}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={toggleFeaturedAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className={`tag-badge cursor-pointer ${
                          t.featured ? "!bg-accent !text-accent-foreground" : ""
                        }`}
                        title="Toggle featured"
                      >
                        {t.featured ? "★ Featured" : "☆"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/tools/${t.id}`}
                        className="text-xs text-accent hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteToolAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmDeleteButton name={t.name} />
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="btn-secondary !px-3 !py-1.5 text-xs">
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="btn-secondary !px-3 !py-1.5 text-xs">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
