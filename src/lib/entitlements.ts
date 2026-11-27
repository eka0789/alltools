import { and, eq, inArray, isNull } from "drizzle-orm";
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
import { getEffectiveProduct } from "@/lib/product-overrides";
import { emailShell, escapeHtml, sendEmail, siteUrl } from "@/lib/email";
import { consumeCouponUsage } from "@/lib/coupons";
import { logOrderEvent } from "@/lib/order-events";
import { notifyAdmin } from "@/lib/notifications";

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
  try {
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
  } catch {
    // Tabel entitlements belum ada (migrasi belum jalan) — degradasi ke free
    // alih-alih crash halaman publik.
    return { ...empty, tier: "free" };
  }
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
  if (order.couponCode) {
    void consumeCouponUsage(order.couponCode).catch(() => undefined);
  }
  await logOrderEvent(order.id, "paid", `Paid ${order.amount} IDR via ${order.provider}`);
  await notifyAdmin({
    type: "order_paid",
    severity: "success",
    title: `Order lunas: ${order.invoiceNo}`,
    body: `${order.amount} IDR — ${order.productId}`,
    link: `/admin/orders/${order.invoiceNo}`,
  });
  // Struk pembelian — best-effort: kegagalan email tidak boleh memengaruhi
  // grant entitlement (yang sudah atomik).
  void sendReceiptEmail(order).catch(() => undefined);
  return { alreadyPaid: false, granted: true };
}

export async function sendReceiptEmail(order: Order): Promise<void> {
  const product = await getEffectiveProduct(order.productId);
  const rows = await db.select({ email: users.email }).from(users).where(eq(users.id, order.userId)).limit(1);
  const to = rows[0]?.email;
  if (!to) return;
  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  const amount = fmt(order.amount);
  const discountLine =
    order.couponCode && order.discountAmount > 0
      ? `Kode promo: <code>${escapeHtml(order.couponCode)}</code> (-${escapeHtml(fmt(order.discountAmount))})<br>`
      : "";
  const downloadCta =
    product?.kind === "template" && product.templateSlug
      ? `<p><a href="${siteUrl()}/templates/${encodeURIComponent(product.templateSlug)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:9px 16px;border-radius:8px;font-weight:600;">Unduh Template Sekarang</a></p>`
      : "";
  const invoiceUrl = `${siteUrl()}/account/invoice/${encodeURIComponent(order.invoiceNo)}`;
  const body = [
    `<p>Pembayaran Anda sudah kami terima. Terima kasih!</p>`,
    `<p><strong>${escapeHtml(product?.name ?? order.productId)}</strong><br>`,
    `Invoice: <code>${escapeHtml(order.invoiceNo)}</code><br>`,
    discountLine,
    `Total dibayar: <strong>${escapeHtml(amount)}</strong></p>`,
    downloadCta,
    `<p>Akses sudah aktif di akun Anda. Anda dapat <a href="${invoiceUrl}">melihat &amp; mencetak invoice PDF</a> atau <a href="${siteUrl()}/account">membuka halaman akun</a> kapan saja.</p>`,
  ].join("");
  await sendEmail({
    to,
    subject: `Pembayaran diterima — ${product?.name ?? "AktifKoding Pro"} (${order.invoiceNo})`,
    html: emailShell("Pembayaran diterima", body),
  });
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
// dibuat atau anggota baru diundang.
export async function acceptTeamInvitesForTeam(teamId: number): Promise<void> {
  const pending = await db
    .select({ id: teamInvites.id, email: teamInvites.email })
    .from(teamInvites)
    .where(and(eq(teamInvites.teamId, teamId), isNull(teamInvites.acceptedAt)));
  if (pending.length === 0) return;

  const pendingEmails = [...new Set(pending.map((p) => p.email))];
  const usersRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, pendingEmails));
  const byEmail = new Map(usersRows.map((u) => [u.email, u.id]));
  const seats = (await db.select({ seats: teams.seats }).from(teams).where(eq(teams.id, teamId)).limit(1))[0]?.seats ?? 10;
  const existingMembers = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  const memberUserIds = new Set(existingMembers.map((m) => m.userId));
  let free = Math.max(0, seats - existingMembers.length);

  for (const invite of pending) {
    const memberUserId = byEmail.get(invite.email);
    if (!memberUserId) continue; // belum pernah login → tetap pending
    if (memberUserIds.has(memberUserId)) {
      await db
        .update(teamInvites)
        .set({ acceptedAt: Date.now() })
        .where(eq(teamInvites.id, invite.id));
      continue;
    }
    if (free <= 0) break;
    await db
      .insert(teamMembers)
      .values({
        teamId,
        userId: memberUserId,
        role: "member",
        createdAt: Date.now(),
      })
      .onConflictDoNothing();
    memberUserIds.add(memberUserId);
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
