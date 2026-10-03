import { NextRequest, NextResponse } from "next/server";
import { db, DB_ACTIVE } from "@/db/client";
import { feedback } from "@/db/schema";
import { getCatalog } from "@/lib/data";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["broken_link", "edit_suggestion"]);

// Receives "Report broken link" / "Suggest edit" submissions from tool
// pages. Shown to moderators in the admin dashboard.
export async function POST(req: NextRequest) {
  const limiter = rateLimit(`feedback:${clientIp(req)}`, 10, 60 * 60_000);
  if (!limiter.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many reports — please try again later." },
      { status: 429 },
    );
  }

  let toolSlug = "";
  let type = "";
  let message = "";
  let honeypot = "";
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (typeof body.toolSlug === "string") toolSlug = body.toolSlug.slice(0, 120);
    if (typeof body.type === "string") type = body.type.slice(0, 40);
    if (typeof body.message === "string") message = body.message.slice(0, 1000);
    if (typeof body.website === "string") honeypot = body.website;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill it, humans never see it. Pretend success.
  if (honeypot) return NextResponse.json({ ok: true });

  if (!TYPES.has(type) || !getCatalog().bySlug.has(toolSlug)) {
    return NextResponse.json({ ok: false, error: "Invalid report." }, { status: 400 });
  }
  if (!DB_ACTIVE) {
    return NextResponse.json(
      { ok: false, error: "Reports are temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    await db.insert(feedback).values({
      toolSlug,
      type,
      message: message.trim(),
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("[feedback] insert failed:", err);
    return NextResponse.json(
      { ok: false, error: "Couldn't save your report right now." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
