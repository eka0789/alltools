import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookA } from "lucide-react";
import { GLOSSARY, getGlossaryTerm } from "@/data/glossary";
import { getCatalog } from "@/lib/data";
import { ToolLogo } from "@/components/tool-logo";

export const revalidate = 120;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return GLOSSARY.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) return { title: "Term not found" };
  return {
    title: `What is ${term.term}? — Developer Glossary`,
    description: term.short,
    alternates: { canonical: `/glossary/${term.slug}` },
    openGraph: {
      title: `What is ${term.term}? — AllTools Glossary`,
      description: term.short,
      type: "article",
      url: `/glossary/${term.slug}`,
    },
  };
}

export default async function GlossaryTermPage({ params }: Props) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) notFound();

  const catalog = getCatalog();
  const tools = (term.relatedTools ?? [])
    .map((s) => catalog.bySlug.get(s))
    .filter((t): t is NonNullable<typeof t> => !!t && t.status !== "deprecated");
  const related = (term.relatedTerms ?? [])
    .map((s) => getGlossaryTerm(s))
    .filter((t): t is NonNullable<typeof t> => !!t);

  // Rich-result markup so search engines can lift the definition.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.definition,
    url: `/glossary/${term.slug}`,
    inDefinedTermSet: { "@type": "DefinedTermSet", name: "AllTools Developer Glossary", url: "/glossary" },
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/glossary" className="hover:text-foreground">Glossary</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{term.term}</span>
      </nav>

      <article>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BookA className="h-6 w-6 shrink-0 text-accent" />
          What is {term.term}?
        </h1>
        <p className="mt-3 text-lg leading-relaxed">{term.short}</p>

        <div className="card mt-6 p-6">
          <p className="leading-relaxed">{term.definition}</p>
          {term.example && (
            <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted p-3.5 text-sm">
              <code>{term.example}</code>
            </pre>
          )}
        </div>
      </article>

      {tools.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Tools for {term.term}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {tools.map((tool) => (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="card flex items-center gap-3 p-3.5 transition-colors hover:border-accent/40"
              >
                <ToolLogo url={tool.url} name={tool.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{tool.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tool.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Related terms</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((rel) => (
              <Link key={rel.slug} href={`/glossary/${rel.slug}`} className="tag-badge hover:text-accent">
                {rel.term}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
