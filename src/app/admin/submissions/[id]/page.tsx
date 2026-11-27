import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { submissions } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getCatalog } from "@/lib/data";
import { SubmissionEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function EditSubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "moderate")) redirect("/admin?error=forbidden");

  const { id } = await params;
  const sp = await searchParams;
  const subId = Number(id);
  if (!DB_ACTIVE || !Number.isFinite(subId)) notFound();

  let sub: typeof submissions.$inferSelect | null = null;
  try {
    sub = (await db.select().from(submissions).where(eq(submissions.id, subId)).limit(1))[0] ?? null;
  } catch {
    notFound();
  }
  if (!sub) notFound();
  if (sub.status !== "pending" && sub.status !== "reviewing") redirect("/admin/submissions");

  const catalog = getCatalog();
  const categories = catalog.categories.map((c) => ({ slug: c.slug, name: c.name }));
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const saved = sp.saved === "1";

  return (
    <div className="py-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit &amp; approve</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sub.name}</p>
        </div>
        <Link href="/admin/submissions" className="btn-secondary">← Submissions</Link>
      </div>

      <SubmissionEditor
        submission={{
          id: sub.id,
          name: sub.name,
          url: sub.url,
          description: sub.description,
          categorySlug: sub.categorySlug,
          pricing: sub.pricing,
          tags: sub.tags,
          githubUrl: sub.githubUrl,
          documentationUrl: sub.documentationUrl,
          submitterEmail: sub.submitterEmail,
          assignedTo: sub.assignedTo,
          internalNotes: sub.internalNotes,
          status: sub.status,
        }}
        categories={categories}
        error={error}
        saved={saved}
      />
    </div>
  );
}
