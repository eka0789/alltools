"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

interface QuickResult {
  slug: string;
  name: string;
  categoryName: string;
  description: string;
  pricing: string;
}

const PLACEHOLDERS = [
  "JSON formatter",
  "API testing",
  "JWT decoder",
  "SQL formatter",
  "Regex tester",
  "Docker tools",
  "AI coding tools",
  "CSS generator",
  "Database GUI",
  "Image compressor",
  "Git cheatsheet",
];

interface SearchBoxProps {
  size?: "lg" | "md";
  initialQuery?: string;
  autoFocus?: boolean;
}

export function SearchBox({ size = "lg", initialQuery = "", autoFocus }: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<QuickResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef(false);

  // Rotating placeholder (pauses while typing)
  useEffect(() => {
    const id = setInterval(() => {
      if (!typingRef.current) {
        setPlaceholderIdx((i) => {
          const next = (i + 1) % PLACEHOLDERS.length;
          setPlaceholder(PLACEHOLDERS[next]);
          return next;
        });
      }
    }, 2600);
    return () => clearInterval(id);
  }, []);

  // Debounced quick results
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.items ?? []);
          setHighlight(-1);
          setOpen(true);
        }
      } catch {
        // aborted
      }
    }, 170);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = useCallback(
    (q: string) => {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      if (highlight >= 0 && results[highlight]) {
        setOpen(false);
        router.push(`/tools/${results[highlight].slug}`);
      } else if (query.trim()) {
        go(query.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const big = size === "lg";

  return (
    <div ref={boxRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/40 ${
          big ? "px-4 py-3" : "px-3 py-2"
        }`}
      >
        <Search className={`${big ? "h-5 w-5" : "h-4 w-4"} shrink-0 text-muted-foreground`} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            typingRef.current = e.target.value.length > 0;
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={typingRef.current ? "" : `What do you need? e.g. ${placeholder}`}
          aria-label="Search developer tools"
          className={`w-full bg-transparent outline-none placeholder:text-muted-foreground/70 ${
            big ? "text-base" : "text-sm"
          }`}
          role="combobox"
          aria-expanded={open}
          aria-controls="search-dropdown"
        />
        {big && (
          <button type="button" onClick={() => query.trim() && go(query.trim())} className="btn-primary shrink-0">
            Search
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          id="search-dropdown"
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <ul>
            {results.map((r, i) => (
              <li key={r.slug} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/tools/${r.slug}`);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                    i === highlight ? "bg-muted" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.categoryName} — {r.description}
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => go(query.trim())}
            className="block w-full border-t border-border px-4 py-2.5 text-left text-sm font-medium text-accent hover:bg-muted"
          >
            See all results for “{query.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
