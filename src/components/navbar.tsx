"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, Plus, Search, Sparkles, UserRound } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";
import { useFavorites } from "@/lib/client-store";

const PRIMARY_LINKS = [
  { href: "/categories", label: "Categories" },
  { href: "/templates", label: "Templates" },
  { href: "/generators", label: "Generators" },
  { href: "/ai-review", label: "AI Review" },
  { href: "/pricing", label: "Pricing", proBadge: true },
];

const MORE_LINKS = [
  { href: "/collections", label: "Collections", desc: "Curated starter packs" },
  { href: "/stacks", label: "Stack Explorer", desc: "Toolbox by tech stack" },
  { href: "/glossary", label: "Glossary", desc: "Developer terms explained" },
  { href: "/whats-new", label: "What's New", desc: "Newest catalog additions" },
  { href: "/developers", label: "API & MCP", desc: "JSON API & IDE integration" },
  { href: "/about", label: "About", desc: "About & data policy" },
];

function Wordmark() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="AktifKoding Logo"
        width={28}
        height={28}
        priority
        className="h-7 w-7 rounded-lg object-cover"
      />
      <span className="text-[15px] font-semibold tracking-tight">
        AktifKoding
      </span>
      <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground xl:inline">
        Developer Tools Pro
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [favorites] = useFavorites();
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHint = () =>
      setSignedIn(
        typeof document !== "undefined" &&
          document.cookie.split(";").some((c) => c.trim().startsWith("at_logged_in=1")),
      );
    checkHint();
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (pathname?.startsWith("/admin")) {
    return <CommandPalette />;
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));
  const moreIsActive = MORE_LINKS.some((l) => isActive(l.href));

  return (
    <>
      <CommandPalette />
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Wordmark />
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
            {PRIMARY_LINKS.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm transition-colors xl:px-2.5 ${
                    active
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                  {l.proBadge && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      Pro
                    </span>
                  )}
                </Link>
              );
            })}
            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm transition-colors xl:px-2.5 ${
                  moreIsActive || moreOpen
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Explore
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="card absolute left-0 top-full z-50 mt-2 w-60 p-1.5 shadow-xl">
                  {MORE_LINKS.map((m) => (
                    <Link
                      key={m.href}
                      href={m.href}
                      onClick={() => setMoreOpen(false)}
                      className={`block rounded-lg px-3 py-2 transition-colors ${
                        isActive(m.href) ? "bg-accent-soft text-accent" : "hover:bg-muted"
                      }`}
                    >
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">{m.desc}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("alltools:open-palette"))}
              aria-label="Search (Ctrl/Cmd+K)"
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline lg:hidden xl:inline">Search…</span>
              <kbd className="hidden rounded border border-border bg-muted px-1 font-mono text-[10px] md:inline lg:hidden xl:inline">
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
            <Link
              href={signedIn ? "/account" : "/login"}
              aria-label={signedIn ? "My Account" : "Sign in to sync your shortlist"}
              title={signedIn ? "My Account & Pro" : "Sign in"}
              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                isActive("/account") || isActive("/login")
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted-foreground hover:border-accent hover:text-accent"
              }`}
            >
              <UserRound className="h-3.5 w-3.5" />
            </Link>
            <ThemeToggle />
            <Link
              href="/submit"
              className="btn-primary hidden h-8 shrink-0 whitespace-nowrap !px-3 !py-0 !text-xs lg:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" />
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
              {PRIMARY_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    isActive(l.href)
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{l.label}</span>
                  {l.proBadge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      <Sparkles className="h-2.5 w-2.5" /> Pro
                    </span>
                  )}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              {MORE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isActive(l.href)
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              <Link
                href={signedIn ? "/account" : "/login"}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {signedIn ? "My Account & Pro" : "Sign in"}
              </Link>
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
