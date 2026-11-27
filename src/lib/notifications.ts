import { desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { notifications, type Notification } from "@/db/schema";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";
import { siteUrl } from "@/lib/email";

// Admin notification center. Business events call notifyAdmin() (best-effort);
// the admin shell shows an unread badge and /admin/notifications lists them.
// When ADMIN_ALERT_WEBHOOK is set, the same message is mirrored to a chat
// webhook (Slack-compatible `text` payload; Telegram works via a bridge).

export type NotificationSeverity = "info" | "warning" | "success";

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
  severity?: NotificationSeverity;
}

export async function notifyAdmin(input: NotifyInput): Promise<void> {
  try {
    await ensureAdminSchema();
    await db.insert(notifications).values({
      type: input.type.slice(0, 60),
      severity: input.severity ?? "info",
      title: input.title.slice(0, 200),
      body: (input.body ?? "").slice(0, 2000),
      link: input.link?.slice(0, 300) ?? null,
      createdAt: Date.now(),
    });
  } catch {
    // notifications must never break the business action
  }

  const webhook = process.env.ADMIN_ALERT_WEBHOOK?.trim();
  if (webhook) {
    const text = [
      `[${input.severity ?? "info"}] ${input.title}`,
      input.body ?? "",
      input.link ? `${siteUrl()}${input.link}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    void fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => undefined);
  }
}

export async function unreadNotificationCount(): Promise<number> {
  try {
    await ensureAdminSchema();
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(notifications)
      .where(isNull(notifications.readAt));
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function latestNotifications(limit = 100): Promise<Notification[]> {
  try {
    await ensureAdminSchema();
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit);
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: number): Promise<void> {
  try {
    await ensureAdminSchema();
    await db
      .update(notifications)
      .set({ readAt: Date.now() })
      .where(eq(notifications.id, id));
  } catch {
    // ignore
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await ensureAdminSchema();
    await db.update(notifications).set({ readAt: Date.now() }).where(isNull(notifications.readAt));
  } catch {
    // ignore
  }
}
