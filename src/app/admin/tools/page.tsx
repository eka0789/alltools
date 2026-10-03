import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { getCatalog } from "@/lib/data";
import { deleteToolAction, toggleFeaturedAction } from "../actions";
import { PricingBadge } from "@/components/tool-card";
import { ConfirmDeleteButton } from "./confirm-delete-button";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminToolsPage({ searchParams }: Props) {
  if (!(await isAdmin())) redirect("/admin");
  const sp = await searchParams;
  const q = String(sp.q ?? "").toLowerCase();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = 30;

  const catalog = getCatalog();
  const filtered = catalog.tools
    .filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.includes(q) ||
        t.url.toLowerCase().includes(q),
    )
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const slice = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Manage Tools</h1>
        <Link href="/admin/tools/new" className="btn-primary">+ Add tool</Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtered.length} tools · page {page} of {totalPages}
      </p>

      {sp.saved && (
        <p className="mt-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
          Tool saved.
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
      {sp.deleted && (
        <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Tool deleted.
        </p>
      )}

      <form className="mt-5 flex gap-2" action="/admin/tools">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by name, slug or URL…"
          className="input max-w-sm"
        />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Tool</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Pricing</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  <span className="font-medium">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.slug}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {t.categoryName}
                </td>
                <td className="px-4 py-2.5"><PricingBadge pricing={t.pricing} /></td>
                <td className="px-4 py-2.5">
                  <span
                    className={`tag-badge ${
                      t.status === "needs_review" ? "!bg-warning/15 !text-warning" : ""
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <form action={toggleFeaturedAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className={`tag-badge cursor-pointer ${t.featured ? "!bg-accent !text-accent-foreground" : ""}`}
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
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/admin/tools?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/tools?q=${encodeURIComponent(q)}&page=${page + 1}`}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
