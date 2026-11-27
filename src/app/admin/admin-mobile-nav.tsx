"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { AdminNav } from "./admin-nav";
import { logoutAction } from "./actions";

type Role = "owner" | "editor" | "moderator";

export function AdminMobileNav({
  role,
  counts,
}: {
  role: Role;
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        aria-label="Buka menu admin"
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="admin-fade-in fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              className="admin-drawer-in admin-scroll fixed inset-y-0 left-0 z-[70] w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-background p-4 shadow-xl lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Menu admin"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Tutup menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <AdminNav role={role} counts={counts} onNavigate={() => setOpen(false)} />
              <form action={logoutAction} className="mt-6 border-t border-border pt-4">
                <button type="submit" className="btn-secondary w-full text-xs">
                  Sign out
                </button>
              </form>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
