import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { Eye, Layers } from "lucide-react";
import { db } from "@/db/client";
import { sharedStacks } from "@/db/schema";
import { getCatalog, type ToolWithMeta } from "@/lib/data";
import { ToolCardCompact } from "@/components/tool-card";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

async function loadSharedStack(id: string) {
  try {
    const rows = await db
      .select()
      .from(sharedStacks)
      .where(eq(sharedStacks.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const stack = await loadSharedStack(id);
  if (!stack) return { title: "Stack not found" };
  return {
    title: `${stack.title} — Shared Stack`,
    description:
      stack.description ||
      `Curated developer tool stack shared on AktifKoding.`,
  };
}

export default async function SharedStackPage({ params }: Props) {
  const { id } = await params;
  const stack = await loadSharedStack(id);
  if (!stack) notFound();

  // Increment view counter best-effort
  void db
    .update(sharedStacks)
    .set({ views: sql`${sharedStacks.views} + 1` })
    .where(eq(sharedStacks.id, id))
    .catch(() => undefined);

  let slugs: string[] = [];
  try {
    const parsed = JSON.parse(stack.slugs);
    if (Array.isArray(parsed)) {
      slugs = parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    slugs = [];
  }

  const { bySlug } = getCatalog();
  const tools = slugs
    .map((s) => bySlug.get(s))
    .filter((t): t is ToolWithMeta => Boolean(t && t.status !== "deprecated"));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/stacks" className="hover:text-foreground">Stacks</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{stack.title}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Layers className="h-6 w-6 text-accent" />
            {stack.title}
          </h1>
          {stack.description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{stack.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {stack.authorLabel && <span>Dibuat oleh {stack.authorLabel}</span>}
            <span>{tools.length} tool</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {stack.views + 1} views
            </span>
          </div>
        </div>
        <Link href="/stacks" className="btn-secondary !py-1.5 text-xs">
          Buat stack sendiri
        </Link>
      </header>

      {tools.length === 0 ? (
        <div className="card mt-8 p-6 text-sm text-muted-foreground">
          Belum ada tool aktif dalam stack ini.
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCardCompact key={tool.slug} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
