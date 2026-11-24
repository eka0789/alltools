"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export function MobileFilterDrawer({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="w-full lg:w-56 lg:shrink-0">
      {/* Mobile toggle button — prevents scrolling past 40+ filter links before seeing results */}
      <div className="mb-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="btn-secondary w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                {activeCount}
              </span>
            )}
          </span>
          {open ? <X className="h-4 w-4" /> : <span className="text-xs text-muted-foreground">Show</span>}
        </button>
      </div>

      <div className={`${open ? "card mb-4 p-4" : "hidden"} lg:sticky lg:top-20 lg:block lg:border-0 lg:bg-transparent lg:p-0`}>
        {children}
      </div>
    </aside>
  );
}
