import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscribers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/newsletter/unsubscribe?token=… — one-click opt-out from every email.
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") ?? "").slice(0, 200);
  if (token) {
    await db
      .update(subscribers)
      .set({ unsubscribedAt: Date.now() })
      .where(eq(subscribers.tokenHash, createHash("sha256").update(token).digest("hex")));
  }
  return NextResponse.redirect(new URL("/whats-new?unsubscribed=1", req.nextUrl.origin));
}
