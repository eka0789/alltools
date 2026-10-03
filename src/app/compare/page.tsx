"use client";

import Link from "next/link";
import { Scale, X } from "lucide-react";
import { useCompare } from "@/lib/client-store";
import { useBulkTools, type BulkTool } from "@/lib/use-bulk-tools";
import { ToolLogo } from "@/components/tool-logo";
import { PRICING_LABEL, type Pricing } from "@/data/types";
import { PLATFORM_LABEL, type Platform } from "@/data/types";

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {items.map((i) => (
        <span key={i} className="tag-badge">
          {i}
        </span>
      ))}
    </div>
  );
}

function Row({ label }: { label: string }) {
  return (
    <div className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2.5 text-center text-sm">{children}</div>;
}

export default function ComparePage() {
  const [compare, toggle] = useCompare();
  const { tools, loading } = useBulkTools(compare);
  const ordered = compare
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter((t): t is BulkTool => !!t);

  const cols = `minmax(90px, 0.6fr) repeat(${Math.max(ordered.length, 1)}, minmax(150px, 1fr))`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Scale className="h-6 w-6 text-accent" />
        Compare tools
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick up to 4 tools with the scale button on any tool card, then compare them side by side.
      </p>

      {compare.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Scale className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium">Nothing to compare yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add tools from any card&apos;s scale icon — your selection is stored locally.
            </p>
          </div>
          <Link href="/tools" className="btn-primary mt-2">
            Browse all tools
          </Link>
        </div>
      ) : loading ? (
        <div className="card mt-8 h-64 animate-pulse bg-muted/40" />
      ) : (
        <div className="card mt-8 overflow-x-auto">
          <div
            className="grid min-w-[640px]"
            style={{ gridTemplateColumns: cols }}
          >
            {/* header row */}
            <div />
            {ordered.map((t) => (
              <div key={t.slug} className="flex flex-col items-center gap-2 border-b border-border px-3 pb-4 pt-1 text-center">
                <div className="flex w-full items-start justify-end">
                  <button
                    type="button"
                    onClick={() => toggle(t.slug)}
                    aria-label={`Remove ${t.name} from comparison`}
                    className="text-muted-foreground transition-colors hover:text-warning"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ToolLogo url={t.url} name={t.name} size="lg" />
                <Link href={`/tools/${t.slug}`} className="font-semibold hover:text-accent">
                  {t.name}
                </Link>
                <span className="text-xs text-muted-foreground">{t.categoryName}</span>
              </div>
            ))}

            <Row label="Pricing" />
            {ordered.map((t) => (
              <Cell key={`p-${t.slug}`}>{PRICING_LABEL[t.pricing as Pricing] ?? t.pricing}</Cell>
            ))}

            <Row label="Open source" />
            {ordered.map((t) => (
              <Cell key={`o-${t.slug}`}>{t.openSource ? "✅ Yes" : "— No"}</Cell>
            ))}

            <Row label="Self-hostable" />
            {ordered.map((t) => (
              <Cell key={`s-${t.slug}`}>{t.selfHosted ? "✅ Yes" : "— No"}</Cell>
            ))}

            <Row label="Platforms" />
            {ordered.map((t) => (
              <Cell key={`pl-${t.slug}`}>
                <List items={t.platforms.map((p) => PLATFORM_LABEL[p as Platform] ?? p)} />
              </Cell>
            ))}

            <Row label="Languages" />
            {ordered.map((t) => (
              <Cell key={`l-${t.slug}`}>
                <List items={t.languages} />
              </Cell>
            ))}

            <Row label="Frameworks" />
            {ordered.map((t) => (
              <Cell key={`f-${t.slug}`}>
                <List items={t.frameworks} />
              </Cell>
            ))}

            <Row label="GitHub stars" />
            {ordered.map((t) => (
              <Cell key={`g-${t.slug}`}>
                {t.githubStars !== null ? `★ ${t.githubStars.toLocaleString()}` : "—"}
              </Cell>
            ))}

            <Row label="Links" />
            {ordered.map((t) => (
              <Cell key={`lk-${t.slug}`}>
                <div className="flex flex-wrap justify-center gap-1.5 text-xs">
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-2 !py-1">
                    Website
                  </a>
                  {t.githubUrl && (
                    <a href={t.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-2 !py-1">
                      GitHub
                    </a>
                  )}
                  {t.documentationUrl && (
                    <a href={t.documentationUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-2 !py-1">
                      Docs
                    </a>
                  )}
                </div>
              </Cell>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
