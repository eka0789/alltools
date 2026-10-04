"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X } from "lucide-react";
import { useCompare } from "@/lib/client-store";
import { useBulkTools } from "@/lib/use-bulk-tools";

// Floating compare tray — previously the compare list was reachable only
// from the mobile menu and footer, so users who added tools to compare had
// no visible affordance on desktop. Hidden on /compare itself and /admin.
export function CompareTray() {
  const pathname = usePathname();
  const [compare, toggle] = useCompare();
  const { tools } = useBulkTools(compare);

  if (
    compare.length === 0 ||
    !pathname ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/compare")
  ) {
    return null;
  }

  const nameOf = (slug: string) => tools.find((t) => t.slug === slug)?.name ?? slug;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 pointer-events-none"
      role="region"
      aria-label="Compare tray"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border bg-card/95 py-1.5 pl-3 pr-1.5 shadow-lg backdrop-blur">
        <Scale className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {compare.map((slug) => (
            <span
              key={slug}
              className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <span className="max-w-28 truncate">{nameOf(slug)}</span>
              <button
                type="button"
                onClick={() => toggle(slug)}
                aria-label={`Remove ${nameOf(slug)} from comparison`}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <Link href="/compare" className="btn-primary shrink-0 !px-3 !py-1 text-xs">
          Compare ({compare.length}/4)
        </Link>
      </div>
    </div>
  );
}
