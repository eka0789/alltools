"use client";

import type { ReactNode } from "react";

// An outbound link that also fires a click-count beacon. Navigation must
// never wait on the beacon: `keepalive: true` lets the request outlive the
// page even when the tab closes immediately.
export function TrackedOutboundLink({
  href,
  slug,
  className,
  children,
  ...rest
}: {
  href: string;
  slug: string;
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  function track() {
    try {
      void fetch("/api/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
        keepalive: true,
      });
    } catch {
      // tracking must never break navigation
    }
  }

  return (
    <a href={href} onClick={track} className={className} {...rest}>
      {children}
    </a>
  );
}
