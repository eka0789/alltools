"use client";

import { usePathname } from "next/navigation";

// The public navbar/footer/compare tray/chat widget are noise inside the
// admin area. Hiding them here keeps the root layout static (no dynamic
// rendering) while giving /admin a clean, app-like shell.
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return null;
  }
  return <>{children}</>;
}
