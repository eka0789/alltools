"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { entitlements, teamInvites, teamMembers, teams, users } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { normalizeEmail } from "@/lib/auth";

async function requireBilling() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");
}

export async function renameTeamAction(formData: FormData) {
  await requireBilling();
  const teamId = Number(formData.get("teamId") ?? 0);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!teamId || !name) redirect("/admin/teams?error=validation");
  await db.update(teams).set({ name }).where(eq(teams.id, teamId));
  await logAudit("team.rename", `team:${teamId}`, `Renamed to ${name}`);
  revalidatePath("/admin/teams");
  redirect("/admin/teams?ok=renamed");
}

export async function setTeamSeatsAction(formData: FormData) {
  await requireBilling();
  const teamId = Number(formData.get("teamId") ?? 0);
  const seats = Number(formData.get("seats") ?? 0);
  if (!teamId || !Number.isFinite(seats) || seats < 1 || seats > 500) {
    redirect("/admin/teams?error=validation");
  }
  await db.update(teams).set({ seats: Math.round(seats) }).where(eq(teams.id, teamId));
  await logAudit("team.seats", `team:${teamId}`, `Seats set to ${seats}`);
  revalidatePath("/admin/teams");
  redirect("/admin/teams?ok=seats");
}

export async function removeTeamMemberAction(formData: FormData) {
  await requireBilling();
  const teamId = Number(formData.get("teamId") ?? 0);
  const userId = Number(formData.get("userId") ?? 0);
  if (!teamId || !userId) redirect("/admin/teams?error=validation");

  const teamRows = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (teamRows[0]?.ownerUserId === userId) {
    redirect("/admin/teams?error=owner");
  }

  await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  await db
    .update(entitlements)
    .set({ revokedAt: Date.now() })
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.teamId, teamId),
        isNull(entitlements.revokedAt),
      ),
    );
  await logAudit("team.remove_member", `team:${teamId}`, `Removed user#${userId}`);
  revalidatePath("/admin/teams");
  redirect("/admin/teams?ok=member_removed");
}

export async function cancelInviteAction(formData: FormData) {
  await requireBilling();
  const id = Number(formData.get("id") ?? 0);
  if (id) {
    await db.delete(teamInvites).where(eq(teamInvites.id, id));
    await logAudit("team.cancel_invite", `invite:${id}`, "Cancelled pending invite");
    revalidatePath("/admin/teams");
  }
  redirect("/admin/teams?ok=invite_cancelled");
}

export async function transferOwnershipAction(formData: FormData) {
  await requireBilling();
  const teamId = Number(formData.get("teamId") ?? 0);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!teamId || !email) redirect("/admin/teams?error=validation");

  const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const newOwner = userRows[0];
  if (!newOwner) redirect("/admin/teams?error=user_not_found");

  await db.update(teams).set({ ownerUserId: newOwner.id }).where(eq(teams.id, teamId));
  await db.update(teamMembers).set({ role: "member" }).where(eq(teamMembers.teamId, teamId));
  await db
    .insert(teamMembers)
    .values({ teamId, userId: newOwner.id, role: "owner", createdAt: Date.now() })
    .onConflictDoUpdate({
      target: [teamMembers.teamId, teamMembers.userId],
      set: { role: "owner" },
    });

  // Make sure the new owner holds the team entitlement.
  const existing = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, newOwner.id),
        eq(entitlements.teamId, teamId),
        isNull(entitlements.revokedAt),
      ),
    )
    .limit(1);
  if (!existing[0]) {
    await db.insert(entitlements).values({
      userId: newOwner.id,
      productId: "pro_all",
      teamId,
      createdAt: Date.now(),
    });
  }
  // Team seats are owned by the buyer; the old owner keeps membership unless
  // removed explicitly.

  await logAudit("team.transfer", `team:${teamId}`, `Ownership transferred to ${email}`);
  revalidatePath("/admin/teams");
  redirect("/admin/teams?ok=transferred");
}
