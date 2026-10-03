"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, CornerDownLeft } from "lucide-react";

interface QuickResult {
  slug: string;
  name: string;
  categoryName: string;
  description: string;
}

const QUICK_LINKS = [
  { href: "/tools", label: "All tools", hint: "Browse the full directory" },
  { href: "/categories", label: "Categories", hint: "26 topic areas" },
  { href: "/collections", label: "Collections", hint: "Curated starter packs" },
  { href: "/tags", label: "Tags", hint: "Thematic groupings" },
  { href: "/stacks", label: "Stacks", hint: "Pick your stack" },
  { href: "/ai-chat", label: "DevDict AI", hint: "Ask the assistant" },
  { href: "/favorites", label: "Your shortlist", hint: "Saved tools" },
  { href: "/compare", label: "Compare", hint: "Side-by-side" },
  { href: "/submit", label: "Submit a tool", hint: "Suggest an addition" },
];

// Global Ctrl/Cmd+K command palette: quick navigation plus live catalog
// search, reachable from every page.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ q: string; items: QuickResult[] }>({
    q: "",
    items: [],
  });
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Global shortcut + Escape + a custom event so the navbar search button
  // can open the palette programmatically.
  useEffect(() => {
    function open() {
      setQuery("");
      setSearch({ q: "", items: [] });
      setHighlight(0);
      setOpen(true);
    }
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) open();
          return !v;
        });
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("alltools:open-palette", open);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("alltools:open-palette", open);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Focus on open (no state updates — ref only)
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced search — results carry their query so display is always
  // consistent with the current input without sync setState.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { items?: QuickResult[] };
          setSearch({ q, items: data.items ?? [] });
          setHighlight(0);
        }
      } catch {
        // aborted
      }
    }, 140);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  const trimmed = query.trim();
  const showQuickLinks = trimmed.length < 2;
  const results = trimmed.length >= 2 && search.q === trimmed ? search.items : [];
  const totalItems = showQuickLinks ? QUICK_LINKS.length : results.length;

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showQuickLinks) {
        go(QUICK_LINKS[highlight]?.href ?? "/tools");
      } else if (results[highlight]) {
        go(`/tools/${results[highlight].slug}`);
      } else if (query.trim()) {
        go(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tools or jump to a page…"
            aria-label="Search tools or jump to a page"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>

        <div id="palette-list" role="listbox" className="max-h-[46vh] overflow-y-auto p-2">
          {showQuickLinks ? (
            <>
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Jump to
              </p>
              {QUICK_LINKS.map((l, i) => (
                <button
                  key={l.href}
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => go(l.href)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                    i === highlight ? "bg-muted" : ""
                  }`}
                >
                  <span>
                    <span className="font-medium">{l.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{l.hint}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches. Press Enter to run a full search.
            </p>
          ) : (
            <>
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Catalog results
              </p>
              {results.map((r, i) => (
                <button
                  key={r.slug}
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => go(`/tools/${r.slug}`)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    i === highlight ? "bg-muted" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.categoryName} — {r.description}
                    </span>
                  </span>
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-accent hover:bg-muted"
              >
                See all results for “{query.trim()}”
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
