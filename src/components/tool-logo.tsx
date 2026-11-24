"use client";

import { useState } from "react";
import { domainOf } from "@/lib/slug";

const SIZES: Record<"sm" | "md" | "lg", { box: string; text: string; px: number }> = {
  sm: { box: "h-5 w-5", text: "text-[10px]", px: 32 },
  md: { box: "h-8 w-8", text: "text-xs", px: 64 },
  lg: { box: "h-12 w-12", text: "text-lg", px: 128 },
};

const MONOGRAM_COLORS = [
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length];
}

export function ToolLogo({
  url,
  name,
  size = "md",
}: {
  url: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const s = SIZES[size];
  const domain = domainOf(url);

  if (failed || !domain) {
    return (
      <span
        className={`${s.box} flex shrink-0 items-center justify-center rounded-md border font-semibold ${colorFor(name)} ${s.text}`}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={`${s.box} flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${s.px}`}
        alt=""
        width={s.px}
        height={s.px}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain p-0.5"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
