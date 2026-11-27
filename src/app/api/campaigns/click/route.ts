import { NextRequest, NextResponse } from "next/server";
import { recordEmailEvent, verifyCampaignToken } from "@/lib/campaigns";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const campaignId = Number(req.nextUrl.searchParams.get("c") ?? 0);
  const email = req.nextUrl.searchParams.get("e") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const rawUrl = req.nextUrl.searchParams.get("u") ?? "";

  // Redirect only for verified campaign links — otherwise this endpoint would
  // be an open redirect for anyone who can craft a URL. Use the canonical site
  // URL: `req.url` is the internal origin (e.g. 0.0.0.0:3000) behind the proxy.
  const valid =
    campaignId > 0 &&
    email.length > 0 &&
    rawUrl.length > 0 &&
    verifyCampaignToken(campaignId, email, token, rawUrl);
  if (!valid) {
    return NextResponse.redirect(`${siteUrl()}/`, 302);
  }

  await recordEmailEvent(campaignId, email, "click", rawUrl || null);

  if (/^https?:\/\//i.test(rawUrl)) {
    return NextResponse.redirect(rawUrl, 302);
  }
  return NextResponse.redirect(`${siteUrl()}/`, 302);
}
