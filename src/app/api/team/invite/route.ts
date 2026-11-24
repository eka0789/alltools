import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { entitlements, teamInvites, teamMembers, teams, users } from "@/db/schema";
import { getSessionUser, normalizeEmail } from "@/lib/auth";
import { acceptTeamInvitesForTeam } from "@/lib/entitlements";
import { actionButton, emailShell, escapeHtml, sendEmail, siteUrl } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/team/invite — owner mengundang email ke timnya. Jika email sudah
// punya akun & masih ada kursi, langsung jadi member; else tersimpan sebagai
// invite pending (auto-join saat email itu login) dan dikirimi email undangan.
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

  if (email === user.email.toLowerCase()) {
    return Response.json({ ok: true, status: "already-member" });
  }

  const [members, openInvites, existingForEmail] = await Promise.all([
    db.select({ id: teamMembers.id, userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, team.id)),
    db
      .select({ id: teamInvites.id })
      .from(teamInvites)
      .where(and(eq(teamInvites.teamId, team.id), isNull(teamInvites.acceptedAt))),
    db
      .select({ id: teamInvites.id, acceptedAt: teamInvites.acceptedAt })
      .from(teamInvites)
      .where(and(eq(teamInvites.teamId, team.id), eq(teamInvites.email, email))),
  ]);

  if (existingForEmail.some((i) => i.acceptedAt !== null)) {
    // Pastikan memang masih anggota aktif (bukan yang pernah dihapus).
    const u = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (u[0] && members.some((m) => m.userId === u[0].id)) {
      return Response.json({ ok: true, status: "already-member" });
    }
  }
  if (existingForEmail.some((i) => i.acceptedAt === null)) {
    return Response.json({ ok: true, status: "invite-pending" });
  }

  if (members.length + openInvites.length >= team.seats) {
    return Response.json({ error: "seats-full" }, { status: 409 });
  }

  await db.insert(teamInvites).values({ teamId: team.id, email, createdAt: Date.now() });
  // Jika email sudah terdaftar, langsung aktifkan seat-nya sekarang juga.
  await acceptTeamInvitesForTeam(team.id);

  // Kirim notifikasi email (best-effort; kegagalan email tidak membatalkan invite).
  const loginLink = `${siteUrl()}/login?next=/account`;
  void sendEmail({
    to: email,
    subject: `Undangan bergabung ke ${team.name} di AktifKoding Pro`,
    html: emailShell(
      "Anda diundang ke tim AktifKoding Pro",
      `<p><strong>${escapeHtml(user.email)}</strong> mengundang Anda bergabung ke tim <strong>${escapeHtml(team.name)}</strong>.</p>
       <p>Masuk dengan email ini untuk langsung mendapatkan akses Pro (semua template premium &amp; AI Code Review).</p>
       <p style="margin:20px 0;">${actionButton(loginLink, "Masuk ke AktifKoding")}</p>`,
    ),
  }).catch(() => undefined);

  // Cek apakah sudah langsung menjadi member aktif.
  const uAfter = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (uAfter[0]) {
    const joined = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, uAfter[0].id)))
      .limit(1);
    if (joined[0]) return Response.json({ ok: true, status: "joined" });
  }

  return Response.json({ ok: true, status: "invited" });
}

// PATCH /api/team/invite — ganti nama tim (hanya owner).
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "login-required" }, { status: 401 });

  let name = "";
  try {
    const body = (await req.json()) as { name?: string };
    name = String(body.name ?? "").trim().slice(0, 60);
  } catch {
    name = "";
  }
  if (name.length < 2) return Response.json({ error: "invalid-name" }, { status: 400 });

  const myTeams = await db.select().from(teams).where(eq(teams.ownerUserId, user.id)).limit(1);
  const team = myTeams[0];
  if (!team) return Response.json({ error: "no-team" }, { status: 404 });

  await db.update(teams).set({ name }).where(eq(teams.id, team.id));
  return Response.json({ ok: true, name });
}

// DELETE /api/team/invite — hapus anggota tim (dan cabut entitlement-nya) atau batalkan pending invite.
export async function DELETE(req: NextRequest) {
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
  if (email === user.email.toLowerCase()) {
    return Response.json({ error: "cannot-remove-owner" }, { status: 400 });
  }

  const myTeams = await db.select().from(teams).where(eq(teams.ownerUserId, user.id)).limit(1);
  const team = myTeams[0];
  if (!team) return Response.json({ error: "no-team" }, { status: 404 });

  // Hapus pending invites untuk email tersebut.
  await db
    .delete(teamInvites)
    .where(and(eq(teamInvites.teamId, team.id), eq(teamInvites.email, email), isNull(teamInvites.acceptedAt)));

  // Jika sudah menjadi member, hapus keanggotaan & cabut entitlement timnya.
  const targetUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (targetUser[0]) {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, targetUser[0].id)));
    await db
      .update(entitlements)
      .set({ revokedAt: Date.now() })
      .where(
        and(
          eq(entitlements.teamId, team.id),
          eq(entitlements.userId, targetUser[0].id),
          isNull(entitlements.revokedAt),
        ),
      );
  }

  return Response.json({ ok: true });
}
