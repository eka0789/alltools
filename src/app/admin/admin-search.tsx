"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

interface ResultItem {
  id: number;
  title: string;
  subtitle?: string;
  href: string;
}

interface Results {
  tools: ResultItem[];
  submissions: ResultItem[];
  orders: ResultItem[];
  users: ResultItem[];
}

// Admin command palette (Ctrl/Cmd+K). Client-side fetch keeps the layout
// static; results are read-only links into the existing admin pages.
export function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (res.ok) setResults((await res.json()) as Results);
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const totalResults =
    (results?.tools.length ?? 0) +
    (results?.submissions.length ?? 0) +
    (results?.orders.length ?? 0) +
    (results?.users.length ?? 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Cari admin (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Cari</span>
        <kbd className="hidden rounded border border-border px-1 text-[9px] sm:inline">Ctrl K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari tools, submissions, orders, users…"
                className="w-full bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 text-sm">
              {loading && <p className="px-2 py-3 text-xs text-muted-foreground">Mencari…</p>}
              {!loading && query.trim().length >= 2 && results && (
                <>
                  <Group title="Tools" items={results.tools} onPick={() => setOpen(false)} />
                  <Group title="Submissions" items={results.submissions} onPick={() => setOpen(false)} />
                  <Group title="Orders" items={results.orders} onPick={() => setOpen(false)} />
                  <Group title="Users" items={results.users} onPick={() => setOpen(false)} />
                  {totalResults === 0 && (
                    <p className="px-2 py-3 text-xs text-muted-foreground">Tidak ada hasil.</p>
                  )}
                </>
              )}
              {query.trim().length < 2 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">Ketik minimal 2 karakter.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({
  title,
  items,
  onPick,
}: {
  title: string;
  items: ResultItem[];
  onPick: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.map((item) => (
        <Link
          key={`${title}-${item.id}`}
          href={item.href}
          onClick={onPick}
          className="block rounded-lg px-2 py-1.5 hover:bg-muted"
        >
          <span className="font-medium">{item.title}</span>
          {item.subtitle && (
            <span className="ml-2 text-xs text-muted-foreground">{item.subtitle}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
