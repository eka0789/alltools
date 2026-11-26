import type { Metadata } from "next";
import Link from "next/link";
import { getAdminIdentity } from "@/lib/admin";
import { AdminNav } from "./admin-nav";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Admin</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {identity.name}{" "}
            <span className="ml-1 rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide">
              {identity.role}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-accent hover:underline">
            View site
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden shrink-0 lg:block lg:w-52">
          <AdminNav role={identity.role} />
        </aside>

        <div className="min-w-0 flex-1">
          <details className="card mb-4 p-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-medium">Menu admin</summary>
            <div className="mt-3">
              <AdminNav role={identity.role} />
            </div>
          </details>
          {children}
        </div>
      </div>
    </div>
  );
}
