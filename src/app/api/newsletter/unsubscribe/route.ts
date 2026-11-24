import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscribers } from "@/db/schema";
import { normalizeSubscriberEmail, verifyUnsubscribeSignature } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/newsletter/unsubscribe?email=…&sig=… (or legacy ?token=…)
export async function GET(req: NextRequest) {
  const email = normalizeSubscriberEmail(req.nextUrl.searchParams.get("email") ?? "");
  const sig = (req.nextUrl.searchParams.get("sig") ?? "").slice(0, 200);
  if (email && sig && verifyUnsubscribeSignature(email, sig)) {
    await db
      .update(subscribers)
      .set({ unsubscribedAt: Date.now() })
      .where(eq(subscribers.email, email));
    return NextResponse.redirect(new URL("/whats-new?unsubscribed=1", req.nextUrl.origin));
  }

  const token = (req.nextUrl.searchParams.get("token") ?? "").slice(0, 200);
  if (token) {
    await db
      .update(subscribers)
      .set({ unsubscribedAt: Date.now() })
      .where(eq(subscribers.tokenHash, createHash("sha256").update(token).digest("hex")));
  }
  return NextResponse.redirect(new URL("/whats-new?unsubscribed=1", req.nextUrl.origin));
}
