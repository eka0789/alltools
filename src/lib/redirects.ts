import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { redirects } from "@/db/schema";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";

// Internal redirect store. Recorded when a tool slug changes (SEO safety) and
// editable from /admin/redirects. The tool page falls back to this table when
// a slug is no longer in the catalog and issues a permanent redirect.

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("\\") || /[\u0000-\u001f\u007f]/.test(trimmed)) return "";
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (normalized.startsWith("//")) return "";
  return normalized;
}

export async function recordRedirect(fromPath: string, toPath: string): Promise<void> {
  const from = normalizePath(fromPath);
  const to = normalizePath(toPath);
  if (!from || !to || from === to) return;
  try {
    await ensureAdminSchema();
    await db
      .insert(redirects)
      .values({ fromPath: from, toPath: to, statusCode: 301, createdAt: Date.now() })
      .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: to } });
  } catch {
    // ignore
  }
}

export async function lookupRedirect(fromPath: string): Promise<string | null> {
  const from = normalizePath(fromPath);
  if (!from) return null;
  try {
    await ensureAdminSchema();
    const rows = await db.select().from(redirects).where(eq(redirects.fromPath, from)).limit(1);
    const match = rows[0];
    if (!match) return null;
    // Best-effort hit counter; never block the redirect.
    void db
      .update(redirects)
      .set({ hits: sql`${redirects.hits} + 1` })
      .where(eq(redirects.id, match.id))
      .catch(() => undefined);
    return match.toPath;
  } catch {
    return null;
  }
}

export async function deleteRedirect(id: number): Promise<void> {
  await ensureAdminSchema();
  await db.delete(redirects).where(eq(redirects.id, id));
}
