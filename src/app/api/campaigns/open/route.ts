import { NextRequest } from "next/server";
import { recordEmailEvent, verifyCampaignToken } from "@/lib/campaigns";

export const runtime = "nodejs";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(req: NextRequest) {
  const campaignId = Number(req.nextUrl.searchParams.get("c") ?? 0);
  const email = req.nextUrl.searchParams.get("e") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (campaignId > 0 && email && verifyCampaignToken(campaignId, email, token)) {
    await recordEmailEvent(campaignId, email, "open", null);
  }
  return new Response(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
}
