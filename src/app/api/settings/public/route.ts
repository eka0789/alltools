import { getAnnouncement } from "@/lib/settings";

export const runtime = "nodejs";
// Cached for 60s: the banner is a public, non-secret string and settings
// change rarely, so this keeps the endpoint cheap without touching the
// page rendering path (the banner is a client component — ISR is untouched).
export const revalidate = 60;

export async function GET() {
  const announcement = await getAnnouncement();
  return Response.json(announcement);
}
