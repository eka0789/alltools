import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { eq, inArray, sql } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { approvals, feedback, submissions } from "@/db/schema";
import { getAdminIdentity } from "@/lib/admin";
import { unreadNotificationCount } from "@/lib/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNav } from "./admin-nav";
import { AdminMobileNav } from "./admin-mobile-nav";
import { AdminPageTitle } from "./admin-page-title";
import { AdminSearch } from "./admin-search";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

// Admin shell. The login screen (/admin when unauthenticated) renders its
// own full-page layout, so the shell only activates once a token is verified.
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const identity = await getAdminIdentity();

  if (!identity) {
    return <>{children}</>;
  }

  const unread = await unreadNotificationCount();
  const counts: Record<string, number> = { "/admin/notifications": unread };
  if (DB_ACTIVE) {
    try {
      const [pendingSubs, openFeedback, pendingApprovals] = await Promise.all([
        db
          .select({ n: sql<number>`count(*)` })
          .from(submissions)
          .where(inArray(submissions.status, ["pending", "reviewing"])),
        db
          .select({ n: sql<number>`count(*)` })
          .from(feedback)
          .where(eq(feedback.status, "open")),
        db
          .select({ n: sql<number>`count(*)` })
          .from(approvals)
          .where(eq(approvals.status, "pending")),
      ]);
      counts["/admin/submissions"] = Number(pendingSubs[0]?.n ?? 0);
      counts["/admin/feedback"] = Number(openFeedback[0]?.n ?? 0);
      counts["/admin/approvals"] = Number(pendingApprovals[0]?.n ?? 0);
    } catch {
      // counts are decorative — the shell must never fail because of them
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:py-6">
      <header className="sticky top-0 z-30 -mx-4 mb-5 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur lg:-mx-0 lg:rounded-xl lg:border lg:bg-card/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AdminMobileNav role={identity.role} counts={counts} />
            <div className="min-w-0">
              <p className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:block">
                Admin
              </p>
              <AdminPageTitle />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <AdminSearch />
            <ThemeToggle />
            <Link
              href="/admin/notifications"
              className="relative inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Notifikasi (${unread} belum dibaca)`}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-2 -top-1.5 rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <Link
              href="/"
              className="hidden text-xs text-accent hover:underline sm:inline"
            >
              View site
            </Link>
            <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
              <span className="max-w-[120px] truncate text-xs text-muted-foreground">
                {identity.name}
              </span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                {identity.role}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="flex gap-6">
        <aside className="hidden shrink-0 lg:block lg:w-56">
          <div className="admin-scroll sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
            <AdminNav role={identity.role} counts={counts} />
            <p className="mt-6 px-2 text-[10px] text-muted-foreground/70">
              Signed in as {identity.name}
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
