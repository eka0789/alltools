import type { Metadata } from "next";
import Link from "next/link";
import { BookA } from "lucide-react";
import { glossaryByCategory, GLOSSARY, GLOSSARY_CATEGORY_ORDER } from "@/data/glossary";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Developer Glossary",
  description:
    "Plain-English definitions of the terms developers encounter every day — REST, ORM, CI/CD, ACID, XSS and dozens more, each linked to real tools.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  const byCategory = glossaryByCategory();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BookA className="h-6 w-6 text-accent" />
          Developer glossary
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {GLOSSARY.length} terms, defined in plain English — what it means, why it
          matters, and the tools behind it. The dictionary half of AllTools.
        </p>
      </header>

      <nav aria-label="Glossary sections" className="mt-6 flex flex-wrap gap-2">
        {GLOSSARY_CATEGORY_ORDER.map((cat) => (
          <a
            key={cat}
            href={`#${cat.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            className="tag-badge hover:text-accent"
          >
            {cat}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-10">
        {GLOSSARY_CATEGORY_ORDER.map((cat) => {
          const terms = byCategory.get(cat) ?? [];
          if (terms.length === 0) return null;
          return (
            <section key={cat} id={cat.toLowerCase().replace(/[^a-z]+/g, "-")}>
              <h2 className="text-lg font-semibold tracking-tight">{cat}</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {terms.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/glossary/${t.slug}`}
                    className="card group flex flex-col p-4 transition-colors hover:border-accent/40"
                  >
                    <dt className="font-semibold group-hover:text-accent">{t.term}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {t.short}
                    </dd>
                  </Link>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
