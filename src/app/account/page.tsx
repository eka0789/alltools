import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, teamInvites, teamMembers, teams, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getUserAccess } from "@/lib/entitlements";
import { getProduct, formatIdr } from "@/lib/products";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Akun Saya",
  robots: { index: false },
};

function statusLabel(s: string): string {
  switch (s) {
    case "paid":
      return "Lunas";
    case "pending":
      return "Menunggu pembayaran";
    case "expired":
      return "Kedaluwarsa";
    case "failed":
      return "Gagal";
    default:
      return s;
  }
}

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  const [myOrders, access] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)),
    getUserAccess(user.id),
  ]);
  myOrders.sort((a, b) => b.createdAt - a.createdAt);

  // Tim yang dimiliki / diikuti
  const memberships = await db
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id));
  const teamIds = memberships.map((m) => m.teamId);
  const myTeams = teamIds.length > 0 ? await db.select().from(teams) : [];
  const ownedTeams = myTeams.filter((t) => t.ownerUserId === user.id);
  const joinedTeams = myTeams.filter(
    (t) => t.ownerUserId !== user.id && teamIds.includes(t.id),
  );

  // Owner: daftar member + pending invite untuk tim miliknya
  const ownedTeamId = ownedTeams[0]?.id ?? null;
  const memberRows = ownedTeamId
    ? await db
        .select({ role: teamMembers.role, email: users.email })
        .from(teamMembers)
        .innerJoin(users, eq(users.id, teamMembers.userId))
        .where(eq(teamMembers.teamId, ownedTeamId))
    : [];
  const pendingRows = ownedTeamId
    ? await db.select({ email: teamInvites.email }).from(teamInvites).where(eq(teamInvites.teamId, ownedTeamId))
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Akun Saya</h1>
      <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>

      {/* Status akses */}
      <section className="card mt-6 p-6">
        <h2 className="text-base font-semibold">Status akses</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              access.tier === "pro" ? "bg-accent-soft text-accent" : "bg-muted text-muted-foreground"
            }`}
          >
            {access.tier === "pro" ? "Pro aktif" : "Free"}
          </span>
          {access.hasLifetime && <span className="text-xs text-muted-foreground">Lifetime</span>}
          {access.teamIds.length > 0 && (
            <span className="text-xs text-muted-foreground">via tim ({access.teamIds.length})</span>
          )}
          {access.tier !== "pro" && (
            <Link href="/pricing" className="text-xs text-accent hover:underline">
              Upgrade →
            </Link>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Template premium yang Anda miliki:{" "}
          {access.hasLifetime
            ? "semua"
            : access.templateIds.length > 0
              ? access.templateIds.map((id) => getProduct(id)?.name ?? id).join(", ")
              : "belum ada"}
        </p>
      </section>

      {/* Pembelian */}
      <section className="card mt-6 p-6">
        <h2 className="text-base font-semibold">Riwayat pembelian</h2>
        {myOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Belum ada pembelian.{" "}
            <Link href="/pricing" className="text-accent hover:underline">
              Lihat paket
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {myOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{getProduct(o.productId)?.name ?? o.productId}</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="font-mono">{o.invoiceNo}</code> · {new Date(o.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatIdr(o.amount)}</p>
                  <p
                    className={`text-xs ${
                      o.status === "paid" ? "text-success" : o.status === "pending" ? "text-warning" : "text-muted-foreground"
                    }`}
                  >
                    {statusLabel(o.status)}
                    {o.status === "pending" && (
                      <>
                        {" · "}
                        <Link href={`/checkout/${o.invoiceNo}`} className="text-accent hover:underline">
                          selesaikan
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tim */}
      {ownedTeams.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="text-base font-semibold">
            Tim Anda — {ownedTeams[0].name} ({memberRows.length}/{ownedTeams[0].seats} seat)
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {memberRows.map((m) => (
              <li key={m.email} className="flex items-center gap-2">
                <span>{m.email}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{m.role}</span>
              </li>
            ))}
            {pendingRows.map((p) => (
              <li key={p.email} className="flex items-center gap-2 text-muted-foreground">
                <span>{p.email}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">menunggu login</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <InviteForm />
          </div>
        </section>
      )}

      {joinedTeams.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="text-base font-semibold">Tim yang Anda ikuti</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {joinedTeams.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
