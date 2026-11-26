"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type Level = "info" | "warning" | "success";

interface Announcement {
  text: string;
  level: Level;
}

// Dismissal is per-announcement: editing the announcement text produces a new
// key, so the new message is shown again even to users who dismissed the old
// one. Stored in sessionStorage (no cookie, no server state).
function dismissKey(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return `ak-announce-${Math.abs(hash).toString(36)}`;
}

const STYLES: Record<Level, { wrap: string; icon: ReactNode }> = {
  info: {
    wrap: "border-accent/30 bg-accent-soft text-accent",
    icon: <Info className="h-4 w-4 shrink-0" />,
  },
  warning: {
    wrap: "border-warning/40 bg-warning/10 text-warning",
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
  },
  success: {
    wrap: "border-success/40 bg-success/10 text-success",
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  },
};

export function AnnouncementBanner() {
  const pathname = usePathname() ?? "";
  const [data, setData] = useState<Announcement | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let cancelled = false;
    fetch("/api/settings/public")
      .then((res) => (res.ok ? (res.json() as Promise<Announcement>) : null))
      .then((announcement) => {
        if (cancelled || !announcement?.text) return;
        setData(announcement);
        try {
          if (sessionStorage.getItem(dismissKey(announcement.text)) === "1") setHidden(true);
        } catch {
          // private mode / storage disabled — banner still shows
        }
      })
      .catch(() => {
        // no banner on network failure
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!data || !data.text || hidden) return null;
  const style = STYLES[data.level] ?? STYLES.info;

  return (
    <div className={`border-b ${style.wrap}`} role="status">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-1.5 text-xs">
        {style.icon}
        <p className="flex-1 leading-snug">{data.text}</p>
        <button
          type="button"
          aria-label="Tutup pengumuman"
          className="shrink-0 rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem(dismissKey(data.text), "1");
            } catch {
              // ignore
            }
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
