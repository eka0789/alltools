import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teamInvites, teamMembers, teams } from "@/db/schema";
import { getSessionUser, normalizeEmail } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/team/invite — owner mengundang email ke timnya. Jika email sudah
// punya akun & masih ada kursi, langsung jadi member; else tersimpan sebagai
// invite pending (auto-join saat email itu login).
export async function POST(req: NextRequest) {
  if (!rateLimit(`team-invite:${clientIp(req)}`, 10, 60_000).ok) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "login-required" }, { status: 401 });

  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = normalizeEmail(String(body.email ?? "")) ?? "";
  } catch {
    email = "";
  }
  if (!email) return Response.json({ error: "invalid-email" }, { status: 400 });

  const myTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.ownerUserId, user.id))
    .limit(1);
  const team = myTeams[0];
  if (!team) return Response.json({ error: "no-team" }, { status: 404 });

  const members = await db.select({ id: teamMembers.id }).from(teamMembers).where(eq(teamMembers.teamId, team.id));
  const pending = await db
    .select({ id: teamInvites.id, acceptedAt: teamInvites.acceptedAt })
    .from(teamInvites)
    .where(and(eq(teamInvites.teamId, team.id), eq(teamInvites.email, email)));
  if (members.length >= team.seats) {
    return Response.json({ error: "seats-full" }, { status: 409 });
  }

  if (pending[0]?.acceptedAt) {
    return Response.json({ ok: true, status: "already-member" });
  }
  if (pending[0]) {
    return Response.json({ ok: true, status: "invite-pending" });
  }
  await db.insert(teamInvites).values({ teamId: team.id, email, createdAt: Date.now() });
  return Response.json({ ok: true, status: "invited" });
}
