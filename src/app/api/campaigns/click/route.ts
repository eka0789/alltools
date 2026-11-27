import { NextRequest, NextResponse } from "next/server";
import { recordEmailEvent, verifyCampaignToken } from "@/lib/campaigns";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const campaignId = Number(req.nextUrl.searchParams.get("c") ?? 0);
  const email = req.nextUrl.searchParams.get("e") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const rawUrl = req.nextUrl.searchParams.get("u") ?? "";

  if (campaignId > 0 && email && verifyCampaignToken(campaignId, email, token)) {
    await recordEmailEvent(campaignId, email, "click", rawUrl || null);
  }

  // Only http(s) targets; anything else falls back to the homepage.
  if (/^https?:\/\//i.test(rawUrl)) {
    return NextResponse.redirect(rawUrl, 302);
  }
  return NextResponse.redirect(new URL("/", req.url), 302);
}
