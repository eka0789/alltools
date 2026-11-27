"use client";

import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  tools: "Tools",
  submissions: "Submissions",
  categories: "Kategori",
  redirects: "Redirects",
  calendar: "Kalender",
  curation: "Kurasi Homepage",
  tags: "Tags",
  "link-health": "Link Health",
  feedback: "Reports",
  stacks: "Shared Stacks",
  orders: "Orders",
  approvals: "Approvals",
  products: "Produk & Harga",
  users: "Users",
  teams: "Teams",
  newsletter: "Newsletter",
  campaigns: "Campaigns",
  collections: "Collections",
  glossary: "Glossary",
  analytics: "Analytics",
  "ai-usage": "AI Usage",
  ops: "Ops Center",
  jobs: "Jobs & Cron",
  sessions: "Admin Sessions",
  audit: "Audit Log",
  settings: "Settings",
  notifications: "Notifikasi",
};

export function AdminPageTitle() {
  const pathname = usePathname() ?? "/admin";
  if (pathname === "/admin" || pathname === "/admin/") {
    return <span className="block truncate text-sm font-semibold">Dashboard</span>;
  }
  const section = pathname.split("/")[2] ?? "";
  const label = LABELS[section] ?? "Admin";
  return <span className="block truncate text-sm font-semibold">{label}</span>;
}
