import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { approvals, type Approval } from "@/db/schema";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";
import { notifyAdmin } from "@/lib/notifications";

// Four-eyes approval queue. Kinds are enabled via ADMIN_REQUIRE_APPROVAL
// (comma-separated, e.g. "refund,price"). A different admin must approve.

export type ApprovalKind = "refund" | "price";

export function approvalRequired(kind: ApprovalKind): boolean {
  const raw = process.env.ADMIN_REQUIRE_APPROVAL?.trim();
  if (!raw) return false;
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .includes(kind);
}

export interface CreateApprovalInput {
  kind: ApprovalKind;
  target: string;
  payload: unknown;
  summary: string;
  requestedBy: string;
}

export async function createApproval(input: CreateApprovalInput): Promise<number | null> {
  try {
    await ensureAdminSchema();
    const inserted = await db
      .insert(approvals)
      .values({
        kind: input.kind,
        target: input.target.slice(0, 200),
        payload: JSON.stringify(input.payload).slice(0, 8000),
        summary: input.summary.slice(0, 300),
        requestedBy: input.requestedBy.slice(0, 80),
        status: "pending",
        createdAt: Date.now(),
      })
      .returning({ id: approvals.id });
    await notifyAdmin({
      type: "approval",
      severity: "warning",
      title: `Persetujuan dibutuhkan: ${input.kind}`,
      body: `${input.summary} — diminta oleh ${input.requestedBy}`,
      link: "/admin/approvals",
    });
    return inserted[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function getApproval(id: number): Promise<Approval | null> {
  try {
    await ensureAdminSchema();
    return (await db.select().from(approvals).where(eq(approvals.id, id)).limit(1))[0] ?? null;
  } catch {
    return null;
  }
}

export async function listApprovals(status = "pending", limit = 100): Promise<Approval[]> {
  try {
    await ensureAdminSchema();
    return await db
      .select()
      .from(approvals)
      .where(eq(approvals.status, status))
      .orderBy(desc(approvals.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export async function decideApproval(
  id: number,
  approver: string,
  decision: "approved" | "rejected",
  note?: string,
): Promise<boolean> {
  try {
    const updated = await db
      .update(approvals)
      .set({
        status: decision,
        decidedBy: approver.slice(0, 80),
        decidedAt: Date.now(),
        note: note?.slice(0, 500) ?? null,
      })
      .where(eq(approvals.id, id));
    return Boolean(updated);
  } catch {
    return false;
  }
}

export function parsePayload<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
