import { redirect } from "next/navigation";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { sharedStacks, type SharedStack } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatDate } from "@/lib/slug";
import { deleteSharedStackAction } from "./actions";

export const dynamic = "force-dynamic";

function toolCount(slugs: string): number {
  try {
    const parsed = JSON.parse(slugs);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default async function SharedStacksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "moderate")) redirect("/admin?error=forbidden");

  const sp = await searchParams;

  let rows: SharedStack[] = [];
  if (DB_ACTIVE) {
    try {
      rows = await db.select().from(sharedStacks).orderBy(desc(sharedStacks.createdAt)).limit(200);
    } catch {
      rows = [];
    }
  }

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shared Stacks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stack publik yang dibagikan pengguna. Hapus konten spam/abuse.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Stack dihapus.
        </p>
      )}

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Judul</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Tools</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Dibuat</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada shared stack.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/stacks/shared/${s.id}`} className="font-medium text-accent hover:underline">
                      {s.title}
                    </Link>
                    {s.description && (
                      <span className="block max-w-[360px] truncate text-xs text-muted-foreground">
                        {s.description}
                      </span>
                    )}
                    <span className="block font-mono text-[10px] text-muted-foreground/70">{s.id}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.authorLabel ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{toolCount(s.slugs)}</td>
                  <td className="px-4 py-2.5 text-xs">{s.views}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteSharedStackAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="btn-secondary !px-2 !py-1 text-xs text-destructive">
                        Delete
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
