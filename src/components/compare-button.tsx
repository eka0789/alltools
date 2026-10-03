"use client";

import Link from "next/link";
import { Scale } from "lucide-react";
import { useCompare } from "@/lib/client-store";

export function CompareButton({
  slug,
  name,
  variant = "icon",
}: {
  slug: string;
  name?: string;
  variant?: "icon" | "button";
}) {
  const [compare, toggle] = useCompare();
  const active = compare.includes(slug);
  const label = active
    ? `Remove ${name ?? slug} from comparison`
    : `Add ${name ?? slug} to comparison`;

  if (variant === "button") {
    return (
      <Link
        href="/compare"
        aria-label={label}
        title={label}
        onClick={() => {
          if (!active) toggle(slug);
        }}
        className={`btn-secondary ${compare.length > 0 ? "!border-accent !text-accent" : ""}`}
      >
        <Scale className="h-4 w-4" />
        Compare{compare.length > 0 ? ` (${compare.length})` : ""}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border text-muted-foreground hover:border-accent hover:text-accent"
      }`}
    >
      <Scale className="h-4 w-4" />
    </button>
  );
}

export function CompareTrayLink() {
  const [compare] = useCompare();
  if (compare.length === 0) return null;
  return (
    <Link
      href="/compare"
      className="chip !border-accent/40 !bg-accent-soft !text-accent"
      aria-label={`Compare ${compare.length} selected tools`}
    >
      <Scale className="mr-1 inline h-3 w-3" />
      {compare.length} to compare
    </Link>
  );
}
