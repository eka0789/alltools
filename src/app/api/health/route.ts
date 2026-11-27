import { dbClient, DB_ACTIVE } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight liveness probe for uptime monitors / the Ops center. No auth,
// no catalog data — just "can we reach the database".
export async function GET() {
  let dbOk = false;
  if (DB_ACTIVE) {
    try {
      await dbClient.execute("SELECT 1");
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  return Response.json(
    {
      ok: dbOk,
      db: dbOk ? "up" : "down",
      time: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
