import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { jobRuns, type JobRun } from "@/db/schema";
import { ensureAdminSchema } from "@/db/ensure-admin-schema";

// Cron/background-job history. Cron routes wrap their work in
// startJobRun/finishJobRun; the Ops center reads the latest row per job so a
// silent failure becomes visible instead of being discovered days later.

export type JobStatus = "running" | "success" | "failed" | "skipped";

export const TRACKED_JOBS = [
  { key: "check-links", label: "Link health sweep" },
  { key: "reconcile-orders", label: "DOKU reconciliation" },
  { key: "weekly-digest", label: "Weekly digest" },
] as const;

export async function startJobRun(job: string): Promise<number | null> {
  try {
    await ensureAdminSchema();
    const inserted = await db
      .insert(jobRuns)
      .values({ job, status: "running", startedAt: Date.now() })
      .returning({ id: jobRuns.id });
    return inserted[0]?.id ?? null;
  } catch {
    // Tracking must never break the job itself.
    return null;
  }
}

export async function finishJobRun(
  id: number | null,
  update: { status: JobStatus; summary?: string; error?: string | null },
): Promise<void> {
  if (!id) return;
  try {
    await db
      .update(jobRuns)
      .set({
        status: update.status,
        summary: (update.summary ?? "").slice(0, 500),
        error: update.error ? update.error.slice(0, 1000) : null,
        finishedAt: Date.now(),
      })
      .where(eq(jobRuns.id, id));
  } catch {
    // ignore
  }
}

export async function latestJobRuns(limit = 60): Promise<JobRun[]> {
  try {
    await ensureAdminSchema();
    return await db.select().from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(limit);
  } catch {
    return [];
  }
}

// First (most recent) run per job, preserving TRACKED_JOBS order.
export function latestPerJob(runs: JobRun[]): Map<string, JobRun> {
  const map = new Map<string, JobRun>();
  for (const run of runs) {
    if (!map.has(run.job)) map.set(run.job, run);
  }
  return map;
}
