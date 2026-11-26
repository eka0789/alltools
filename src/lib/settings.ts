import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { ensureOpsSchema } from "./admin";

// Feature flags / kill switches editable from /admin/settings. Stored as
// plain strings in site_settings so adding a flag needs no migration.
// Defaults are always "enabled" — a missing row or DB hiccup must never
// silently turn off sales.

export const SETTING_KEYS = {
  checkoutEnabled: "checkout_enabled",
  aiReviewEnabled: "ai_review_enabled",
  announcement: "announcement",
  announcementLevel: "announcement_level",
} as const;

export type AnnouncementLevel = "info" | "warning" | "success";

export interface Announcement {
  text: string;
  level: AnnouncementLevel;
}

export async function getAnnouncement(): Promise<Announcement> {
  const [text, level] = await Promise.all([
    getSetting(SETTING_KEYS.announcement),
    getSetting(SETTING_KEYS.announcementLevel),
  ]);
  return {
    text: text ?? "",
    level: level === "warning" || level === "success" ? level : "info",
  };
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    await ensureOpsSchema();
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureOpsSchema();
  const now = Date.now();
  await db
    .insert(siteSettings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: now } });
}

export async function isCheckoutEnabled(): Promise<boolean> {
  return (await getSetting(SETTING_KEYS.checkoutEnabled)) !== "false";
}

export async function isAiReviewEnabled(): Promise<boolean> {
  return (await getSetting(SETTING_KEYS.aiReviewEnabled)) !== "false";
}
