"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { ChatPanel } from "./chat-panel";

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [greeted, setGreeted] = useState(false);

  // gentle attention pulse once per session, ~6s after first load
  useEffect(() => {
    if (greeted) return;
    const t = setTimeout(() => setGreeted(true), 6000);
    return () => clearTimeout(t);
  }, [greeted]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="DevDict AI chat"
          className="card fixed bottom-20 right-3 z-50 flex h-[min(66vh,540px)] w-[min(94vw,400px)] flex-col overflow-hidden shadow-2xl shadow-black/20 sm:right-5 chat-pop"
        >
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-accent to-accent-hover px-4 py-3 text-accent-foreground">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Sparkles className="h-4 w-4" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-success" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">DevDict AI</p>
                <p className="text-[11px] leading-tight text-accent-foreground/80">
                  Developer Dictionary Assistant · Online
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup chat"
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel variant="widget" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setGreeted(true);
        }}
        aria-label={open ? "Tutup DevDict AI" : "Buka DevDict AI — asisten rekomendasi tools & profesi"}
        className="fixed bottom-4 right-3 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-accent-foreground shadow-xl shadow-accent/30 transition-transform hover:scale-105 active:scale-95 sm:right-5"
      >
        {!open && !greeted && (
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 [animation-duration:2s]" />
        )}
        {open ? <X className="relative h-6 w-6" /> : <MessageCircle className="relative h-6 w-6" />}
      </button>
    </>
  );
}
