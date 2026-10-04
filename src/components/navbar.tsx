"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Heart, Search } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";
import { useFavorites } from "@/lib/client-store";

const LINKS = [
  { href: "/categories", label: "Categories" },
  { href: "/glossary", label: "Glossary" },
  { href: "/collections", label: "Collections" },
  { href: "/search?category=ai", label: "AI Tools" },
  { href: "/stacks", label: "Stacks" },
  { href: "/ai-chat", label: "AI Chat" },
  { href: "/about", label: "About" },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-mono text-[13px] font-bold text-accent-foreground">
        A
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        AllTools
      </span>
      <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
        The Developer Dictionary
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [favorites] = useFavorites();

  if (pathname?.startsWith("/admin")) {
    return <CommandPalette />;
  }

  return (
    <>
      <CommandPalette />
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Wordmark />
          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {/* Global search affordance — the site is search-first, the
                navbar should say so. Also opens with Ctrl/Cmd+K anywhere. */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("alltools:open-palette"))}
              aria-label="Search (Ctrl/Cmd+K)"              className="inline-flex h-8 items-center gap-2 rounded-lg border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search…</span>
              <kbd className="hidden rounded border border-border bg-muted px-1 font-mono text-[10px] md:inline">
                ⌘K
              </kbd>
            </button>
            <Link
              href="/favorites"
              aria-label={`Your shortlist (${favorites.length} saved tools)`}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <Heart className={`h-3.5 w-3.5 ${favorites.length > 0 ? "fill-accent text-accent" : ""}`} />
              {favorites.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                  {favorites.length > 9 ? "9+" : favorites.length}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <Link href="/submit" className="btn-primary hidden sm:inline-flex">
              Submit Tool
            </Link>
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border lg:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-background lg:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/favorites"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Your shortlist{favorites.length > 0 ? ` (${favorites.length})` : ""}
              </Link>
              <Link
                href="/compare"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Compare tools
              </Link>
              <Link
                href="/submit"
                onClick={() => setOpen(false)}
                className="btn-primary mt-1"
              >
                Submit Tool
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
