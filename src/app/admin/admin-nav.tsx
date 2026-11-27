"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Copy,
  Flag,
  FolderTree,
  HeartPulse,
  Inbox,
  Layers,
  LayoutDashboard,
  ListChecks,
  Mail,
  Receipt,
  Route,
  ScrollText,
  ServerCog,
  Settings,
  Sparkles,
  Tag,
  Users,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type Role = "owner" | "editor" | "moderator";
type Cap = "moderate" | "catalog" | "billing" | "system";

const RANK: Record<Role, number> = { moderator: 1, editor: 2, owner: 3 };

// Kept local (not imported from @/lib/admin) so this client component never
// pulls server-only modules (next/headers, db) into the browser bundle.
function allowed(role: Role, cap: Cap): boolean {
  if (cap === "moderate") return RANK[role] >= 1;
  if (cap === "catalog") return RANK[role] >= 2;
  return role === "owner";
}

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  cap: Cap;
}

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Ringkasan",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, cap: "moderate" }],
  },
  {
    title: "Katalog",
    items: [
      { href: "/admin/tools", label: "Tools", icon: Wrench, cap: "catalog" },
      { href: "/admin/submissions", label: "Submissions", icon: Inbox, cap: "moderate" },
      { href: "/admin/categories", label: "Kategori", icon: FolderTree, cap: "catalog" },
      { href: "/admin/redirects", label: "Redirects", icon: Route, cap: "catalog" },
      { href: "/admin/tools/duplicates", label: "Duplikat", icon: Copy, cap: "catalog" },
    ],
  },
  {
    title: "Kualitas",
    items: [
      { href: "/admin/link-health", label: "Link Health", icon: HeartPulse, cap: "catalog" },
      { href: "/admin/feedback", label: "Reports", icon: Flag, cap: "moderate" },
      { href: "/admin/stacks", label: "Shared Stacks", icon: Layers, cap: "moderate" },
    ],
  },
  {
    title: "Komersial",
    items: [
      { href: "/admin/orders", label: "Orders", icon: Receipt, cap: "billing" },
      { href: "/admin/products", label: "Produk & Harga", icon: Tag, cap: "billing" },
      { href: "/admin/users", label: "Users", icon: Users, cap: "billing" },
      { href: "/admin/teams", label: "Teams", icon: UsersRound, cap: "billing" },
    ],
  },
  {
    title: "Konten & Data",
    items: [
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail, cap: "catalog" },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, cap: "catalog" },
      { href: "/admin/ai-usage", label: "AI Usage", icon: Sparkles, cap: "catalog" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/admin/ops", label: "Ops Center", icon: ServerCog, cap: "system" },
      { href: "/admin/jobs", label: "Jobs & Cron", icon: ListChecks, cap: "system" },
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText, cap: "system" },
      { href: "/admin/settings", label: "Settings", icon: Settings, cap: "system" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="space-y-5 text-sm">
      {SECTIONS.map((section) => {
        const items = section.items.filter((item) => allowed(role, item.cap));
        if (items.length === 0) return null;
        return (
          <div key={section.title}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
                        active
                          ? "bg-accent-soft font-medium text-accent"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
