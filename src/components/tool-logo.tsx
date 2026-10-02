"use client";

import { useState } from "react";
import { domainOf } from "@/lib/slug";

const SIZES: Record<"sm" | "md" | "lg", { box: string; text: string; px: number }> = {
  sm: { box: "h-5 w-5", text: "text-[10px]", px: 32 },
  md: { box: "h-8 w-8", text: "text-xs", px: 64 },
  lg: { box: "h-12 w-12", text: "text-lg", px: 128 },
};

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
        className={`${s.box} flex shrink-0 items-center justify-center rounded-md border border-border bg-accent-soft font-semibold text-accent ${s.text}`}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={`${s.box} flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${s.px}`}
        alt=""
        width={s.px}
        height={s.px}
        loading="lazy"
        className="h-full w-full object-contain p-0.5"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
