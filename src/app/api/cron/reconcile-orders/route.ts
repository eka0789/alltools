import { NextRequest, NextResponse } from "next/server";
import { reconcilePendingOrders } from "@/lib/reconcile";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Trigger manual/programmatic rekonsiliasi order (bearer CRON_SECRET).
// Cron otomatis berjalan di ekor /api/cron/check-links (batas Hobby 2 cron);
// route ini tetap berguna untuk memicu kapan pun — mis. setelah mengubah
// kredensial DOKU atau saat upgrade ke Pro (jadwal per jam via vercel.json).
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`cron-reconcile:${clientIp(req)}`, 4, 60_000).ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  const result = await reconcilePendingOrders(25);
  return NextResponse.json({ ok: true, ...result });
}

// Vercel Cron mengirim GET — alias ke handler yang sama.
export const GET = POST;
