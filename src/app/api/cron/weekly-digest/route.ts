import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/lib/digest";
import { safeEqual } from "@/lib/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { finishJobRun, startJobRun } from "@/lib/job-runs";

export const runtime = "nodejs";
export const maxDuration = 60;

// Weekly digest cron (Vercel Cron, Mondays 09:00 UTC — see vercel.json).
// Delivery + content live in src/lib/digest.ts so the admin "Send now" button
// produces exactly the same email. Confirmed double-opt-in subscribers only.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`digest:${clientIp(req)}`, 2, 60_000).ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const runId = await startJobRun("weekly-digest");
  try {
    const result = await sendWeeklyDigest();
    await finishJobRun(runId, {
      status: result.skipped ? "skipped" : "success",
      summary: `recipients=${result.recipients} sent=${result.sent}${
        result.skipped ? ` skipped=${result.skipped}` : ""
      }`,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await finishJobRun(runId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Vercel Cron mengirim GET — alias ke handler yang sama (sebelumnya hanya
// POST sehingga cron mingguan gagal 405 diam-diam).
export const GET = POST;
