import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "About",
  description:
    "AllTools is the developer dictionary: an organized, searchable knowledge base of developer tools. Learn about our data policy and principles.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const { total, categories } = getCatalog();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">About AllTools</h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">
            AllTools is The Developer Dictionary
          </strong>{" "}
          — one search for every developer need. AllTools does not try to
          rebuild every utility on the internet. Instead, it collects,
          categorizes and points developers to the right existing tool, so the
          answer to <em>“I need a tool to do X — where do I find it?”</em> is
          always one search away.
        </p>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-foreground">What AllTools is</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>A discovery engine and directory for the developer ecosystem.</li>
            <li>
              {total.toLocaleString()} curated tools across {categories.length}{" "}
              categories, with tags, pricing, platforms, docs and GitHub links.
            </li>
            <li>
              Search that understands you: fuzzy matching, typo tolerance,
              synonyms and task-based queries like{" "}
              <Link href="/search?q=test%20rest%20api" className="text-accent hover:underline">
                “test REST API”
              </Link>
              .
            </li>
            <li>
              A{" "}
              <Link href="/stacks" className="text-accent hover:underline">
                stack explorer
              </Link>{" "}
              that builds a personalized toolbox from your technologies.
            </li>
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-foreground">What AllTools is not</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>A clone or re-implementation of the tools it lists.</li>
            <li>
              An iframe wrapper — every “Open Website” action takes you to the
              official site.
            </li>
            <li>
              A ranking site. We do not claim any tool is “the best” without
              objective evidence, and we never show invented statistics.
            </li>
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-foreground">Data quality policy</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Every entry links to a real, official URL.</li>
            <li>URLs are periodically re-verified by an automated link checker.</li>
            <li>Broken entries are flagged for review, never silently deleted.</li>
            <li>Pricing and platform metadata are editorial and kept conservative.</li>
            <li>Community submissions go through moderator review.</li>
          </ul>
        </div>

        <p>
          Found an outdated entry or missing tool?{" "}
          <Link href="/submit" className="text-accent hover:underline">
            Submit it
          </Link>{" "}
          — the directory gets better with every contribution.
        </p>
      </div>
    </div>
  );
}
