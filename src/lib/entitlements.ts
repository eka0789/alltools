import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  entitlements,
  orders,
  teamInvites,
  teamMembers,
  teams,
  users,
  type Order,
} from "@/db/schema";
import { getProduct } from "@/lib/products";

// ── Entitlement: apa yang boleh diakses seorang pengguna ─────────────────
// Entitlement "materialized": saat order dibayar, satu baris per user dibuat
// (untuk paket tim: satu baris per seat yang sudah terisi). Semua query UI
// cukup membaca tabel ini — tanpa hitung ulang dari order.

export type Tier = "anon" | "free" | "pro";

export interface UserAccess {
  tier: Tier;
  hasLifetime: boolean;
  /** product ids template yang dimiliki (termasuk yang dicakup pro_all). */
  templateIds: string[];
  teamIds: number[];
}

export async function getUserAccess(userId: number | null): Promise<UserAccess> {
  const empty: UserAccess = { tier: "anon", hasLifetime: false, templateIds: [], teamIds: [] };
  if (!userId) return empty;
  const rows = await db
    .select({ productId: entitlements.productId, teamId: entitlements.teamId })
    .from(entitlements)
    .where(and(eq(entitlements.userId, userId), isNull(entitlements.revokedAt)));
  const hasLifetime = rows.some((r) => r.productId === "pro_all");
  const templateIds = rows
    .filter((r) => r.productId.startsWith("tpl:") && r.productId !== "pro_all")
    .map((r) => r.productId);
  const teamIds = [...new Set(rows.map((r) => r.teamId).filter((id): id is number => id !== null))];
  return {
    tier: hasLifetime || teamIds.length > 0 ? "pro" : "free",
    hasLifetime,
    templateIds,
    teamIds,
  };
}

// Akses template premium: milik langsung ATAU lifetime ATAU tim.
export function canDownloadTemplate(
  access: UserAccess,
  templateSlug: string,
): boolean {
  return access.hasLifetime || access.templateIds.includes(`tpl:${templateSlug}`);
}

// Idempoten: tandai order dibayar + beri entitlement. Dipanggil webhook,
// status-poll halaman sukses, dan simulasi — semuanya lewat satu pintu.
export async function finalizeOrderIfPaid(
  order: Order,
  providerPayload: string | null,
): Promise<{ alreadyPaid: boolean; granted: boolean }> {
  if (order.status === "paid") return { alreadyPaid: true, granted: false };
  const now = Date.now();
  const updated = await db
    .update(orders)
    .set({ status: "paid", paidAt: now, providerPayload, updatedAt: now })
    .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  // .returning() hanya berisi baris saat kondisi where terpenuhi —
  // idempotensi atomik: request kedua kehilangan perlombaan dan berhenti.
  if (updated.length === 0) return { alreadyPaid: true, granted: false };

  await grantEntitlements(order);
  return { alreadyPaid: false, granted: true };
}

async function grantEntitlements(order: Order): Promise<void> {
  const now = Date.now();
  const product = getProduct(order.productId);
  if (product?.kind === "lifetime") {
    // Normalisasi: semua pembelian lifetime → wildcard "pro_all".
    await db.insert(entitlements).values({
      userId: order.userId,
      productId: "pro_all",
      orderId: order.id,
      createdAt: now,
    });
    return;
  }
  if (product?.kind === "template") {
    await db.insert(entitlements).values({
      userId: order.userId,
      productId: order.productId,
      orderId: order.id,
      createdAt: now,
    });
    return;
  }
  if (product?.kind === "team") {
    const inserted = await db
      .insert(teams)
      .values({
        name: `Tim ${order.invoiceNo}`,
        ownerUserId: order.userId,
        seats: product.seats ?? 10,
        createdAt: now,
      })
      .returning({ id: teams.id });
    const teamId = inserted[0].id;
    await db
      .insert(teamMembers)
      .values({ teamId, userId: order.userId, role: "owner", createdAt: now });
    await db.insert(entitlements).values({
      userId: order.userId,
      productId: "pro_all",
      orderId: order.id,
      teamId,
      createdAt: now,
    });
    // Undangan yang sudah menunggu diaktifkan (batas seat diperiksa di
    // acceptTeamInvites).
    await acceptTeamInvitesForTeam(teamId);
  }
}

// Auto-join: saat email yang diundang login, terima undangan timnya selama
// masih ada kursi. Dipanggil dari redeemMagicToken (login) dan saat tim
// dibuat.
export async function acceptTeamInvitesForTeam(teamId: number): Promise<void> {
  const pending = await db
    .select({ id: teamInvites.id, email: teamInvites.email })
    .from(teamInvites)
    .where(and(eq(teamInvites.teamId, teamId), isNull(teamInvites.acceptedAt)));
  if (pending.length === 0) return;

  const usersRows = await db.select({ id: users.id, email: users.email }).from(users);
  const byEmail = new Map(usersRows.map((u) => [u.email, u.id]));
  const seats = (await db.select({ seats: teams.seats }).from(teams).where(eq(teams.id, teamId)).limit(1))[0]?.seats ?? 10;
  const memberCount = (await db.select({ id: teamMembers.id }).from(teamMembers).where(eq(teamMembers.teamId, teamId))).length;
  let free = Math.max(0, seats - memberCount);

  for (const invite of pending) {
    if (free <= 0) break;
    const memberUserId = byEmail.get(invite.email);
    if (!memberUserId) continue; // belum pernah login → tetap pending
    await db.insert(teamMembers).values({
      teamId,
      userId: memberUserId,
      role: "member",
      createdAt: Date.now(),
    });
    await db.insert(entitlements).values({
      userId: memberUserId,
      productId: "pro_all",
      teamId,
      createdAt: Date.now(),
    });
    await db
      .update(teamInvites)
      .set({ acceptedAt: Date.now() })
      .where(eq(teamInvites.id, invite.id));
    free -= 1;
  }
}

// Saat pengguna login, aktifkan semua undangan pending yang cocok dengan
// emailnya (bisa lebih dari satu tim).
export async function acceptPendingInvitesForUser(email: string): Promise<void> {
  const invites = await db
    .select({ id: teamInvites.id, teamId: teamInvites.teamId })
    .from(teamInvites)
    .where(and(eq(teamInvites.email, email), isNull(teamInvites.acceptedAt)));
  for (const invite of invites) {
    await acceptTeamInvitesForTeam(invite.teamId);
  }
}
