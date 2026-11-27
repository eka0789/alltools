import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { getAdminIdentity } from "@/lib/admin";
import { latestNotifications, unreadNotificationCount } from "@/lib/notifications";
import { formatDate } from "@/lib/slug";
import { markAllReadAction, markReadAction } from "./actions";

export const dynamic = "force-dynamic";

function severityClass(severity: string): string {
  if (severity === "warning") return "text-warning";
  if (severity === "success") return "text-success";
  return "text-accent";
}

export default async function NotificationsPage() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");

  const [rows, unread] = await Promise.all([
    latestNotifications(100),
    unreadNotificationCount(),
  ]);

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bell className="h-5 w-5" /> Notifikasi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread} belum dibaca · event bisnis & kegagalan cron.
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button type="submit" className="btn-secondary">
              <CheckCheck className="h-4 w-4" /> Tandai semua dibaca
            </button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="card mt-6 p-5 text-sm text-muted-foreground">Belum ada notifikasi.</p>
      ) : (
        <ul className="card mt-6 divide-y divide-border text-sm">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${
                row.readAt ? "opacity-70" : ""
              }`}
            >
              <div className="min-w-0">
                <p className={`font-medium ${severityClass(row.severity)}`}>
                  {row.title}
                  {!row.readAt && (
                    <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-semibold text-accent">
                      baru
                    </span>
                  )}
                </p>
                {row.body && <p className="mt-0.5 text-xs text-muted-foreground">{row.body}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  {formatDate(row.createdAt)} · {row.type}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.link && (
                  <Link href={row.link} className="text-xs text-accent hover:underline">
                    Buka →
                  </Link>
                )}
                {!row.readAt && (
                  <form action={markReadAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className="btn-secondary !px-2 !py-1 text-xs">
                      Tandai dibaca
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
