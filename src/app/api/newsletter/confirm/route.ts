import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { subscribers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/newsletter/confirm?token=… — double-opt-in confirmation.
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") ?? "").slice(0, 200);
  if (token) {
    await db
      .update(subscribers)
      .set({ confirmedAt: Date.now() })
      .where(
        and(
          eq(subscribers.tokenHash, createHash("sha256").update(token).digest("hex")),
          isNull(subscribers.confirmedAt),
        ),
      );
  }
  return NextResponse.redirect(new URL("/whats-new?subscribed=1", req.nextUrl.origin));
}
