import { NextRequest, NextResponse } from "next/server";
import { recordEmailEvent, verifyCampaignToken } from "@/lib/campaigns";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const campaignId = Number(req.nextUrl.searchParams.get("c") ?? 0);
  const email = req.nextUrl.searchParams.get("e") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const rawUrl = req.nextUrl.searchParams.get("u") ?? "";

  // Redirect only for verified campaign links — otherwise this endpoint would
  // be an open redirect for anyone who can craft a URL.
  const valid =
    campaignId > 0 && email.length > 0 && verifyCampaignToken(campaignId, email, token);
  if (!valid) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  await recordEmailEvent(campaignId, email, "click", rawUrl || null);

  if (/^https?:\/\//i.test(rawUrl)) {
    return NextResponse.redirect(rawUrl, 302);
  }
  return NextResponse.redirect(new URL("/", req.url), 302);
}
