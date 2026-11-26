import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { teamInvites, teamMembers, teams, users } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { formatDate } from "@/lib/slug";
import {
  cancelInviteAction,
  removeTeamMemberAction,
  renameTeamAction,
  setTeamSeatsAction,
  transferOwnershipAction,
} from "./actions";

export const dynamic = "force-dynamic";

interface TeamRow {
  id: number;
  name: string;
  ownerUserId: number;
  seats: number;
  createdAt: number;
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "billing")) redirect("/admin?error=forbidden");

  const sp = await searchParams;

  let teamRows: TeamRow[] = [];
  let members: { teamId: number; userId: number; role: string; email: string }[] = [];
  let invites: { id: number; teamId: number; email: string; acceptedAt: number | null; createdAt: number }[] = [];
  let ownerEmails = new Map<number, string>();

  if (DB_ACTIVE) {
    try {
      teamRows = await db
        .select({
          id: teams.id,
          name: teams.name,
          ownerUserId: teams.ownerUserId,
          seats: teams.seats,
          createdAt: teams.createdAt,
        })
        .from(teams)
        .orderBy(desc(teams.createdAt))
        .limit(100);

      const teamIds = teamRows.map((t) => t.id);
      if (teamIds.length > 0) {
        const [memberRows, inviteRows, ownerRows] = await Promise.all([
          db
            .select({
              teamId: teamMembers.teamId,
              userId: teamMembers.userId,
              role: teamMembers.role,
              email: users.email,
            })
            .from(teamMembers)
            .innerJoin(users, eq(users.id, teamMembers.userId))
            .where(inArray(teamMembers.teamId, teamIds)),
          db
            .select({
              id: teamInvites.id,
              teamId: teamInvites.teamId,
              email: teamInvites.email,
              acceptedAt: teamInvites.acceptedAt,
              createdAt: teamInvites.createdAt,
            })
            .from(teamInvites)
            .where(inArray(teamInvites.teamId, teamIds)),
          db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(inArray(users.id, teamRows.map((t) => t.ownerUserId))),
        ]);
        members = memberRows;
        invites = inviteRows;
        ownerEmails = new Map(ownerRows.map((o) => [o.id, o.email]));
      }
    } catch {
      teamRows = [];
    }
  }

  const membersByTeam = new Map<number, typeof members>();
  for (const m of members) {
    const list = membersByTeam.get(m.teamId) ?? [];
    list.push(m);
    membersByTeam.set(m.teamId, list);
  }
  const invitesByTeam = new Map<number, typeof invites>();
  for (const inv of invites) {
    if (inv.acceptedAt) continue;
    const list = invitesByTeam.get(inv.teamId) ?? [];
    list.push(inv);
    invitesByTeam.set(inv.teamId, list);
  }

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola tim Paket Tim: rename, kursi, anggota, undangan, dan transfer kepemilikan.
        </p>
      </div>

      {typeof sp.ok === "string" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          {sp.ok === "renamed" && "Nama tim diperbarui."}
          {sp.ok === "seats" && "Jumlah kursi diperbarui."}
          {sp.ok === "member_removed" && "Anggota dihapus dan entitlement-nya dicabut."}
          {sp.ok === "invite_cancelled" && "Undangan dibatalkan."}
          {sp.ok === "transferred" && "Kepemilikan tim dipindahkan."}
        </p>
      )}
      {typeof sp.error === "string" && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {sp.error === "owner" && "Pemilik tim tidak bisa dihapus — transfer kepemilikan dulu."}
          {sp.error === "user_not_found" && "Email tujuan belum terdaftar sebagai user."}
          {sp.error === "validation" && "Input tidak valid."}
        </p>
      )}

      {teamRows.length === 0 ? (
        <p className="card mt-6 p-5 text-sm text-muted-foreground">Belum ada tim.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {teamRows.map((team) => {
            const teamMembersList = membersByTeam.get(team.id) ?? [];
            const pendingInvites = invitesByTeam.get(team.id) ?? [];
            return (
              <div key={team.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <form action={renameTeamAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="teamId" value={team.id} />
                      <input
                        name="name"
                        defaultValue={team.name}
                        className="input !w-auto max-w-[240px] text-sm font-semibold"
                        aria-label="Team name"
                      />
                      <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">Rename</button>
                    </form>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Owner: {ownerEmails.get(team.ownerUserId) ?? `#${team.ownerUserId}`} · dibuat{" "}
                      {formatDate(team.createdAt)}
                    </p>
                  </div>
                  <form action={setTeamSeatsAction} className="flex items-center gap-2">
                    <input type="hidden" name="teamId" value={team.id} />
                    <label className="text-xs text-muted-foreground">
                      Seats
                      <input
                        name="seats"
                        type="number"
                        min={1}
                        max={500}
                        defaultValue={team.seats}
                        className="input ml-1 !w-20 !py-1 text-xs"
                      />
                    </label>
                    <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">Set</button>
                  </form>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Anggota ({teamMembersList.length}/{team.seats})
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {teamMembersList.length === 0 && (
                        <li className="text-xs text-muted-foreground">Belum ada anggota.</li>
                      )}
                      {teamMembersList.map((m) => (
                        <li key={m.userId} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">
                            {m.email}
                            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px]">{m.role}</span>
                          </span>
                          {m.role !== "owner" && (
                            <form action={removeTeamMemberAction}>
                              <input type="hidden" name="teamId" value={team.id} />
                              <input type="hidden" name="userId" value={m.userId} />
                              <button type="submit" className="text-xs text-destructive hover:underline">
                                Hapus
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Undangan pending ({pendingInvites.length})
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {pendingInvites.length === 0 && (
                        <li className="text-xs text-muted-foreground">Tidak ada undangan pending.</li>
                      )}
                      {pendingInvites.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-muted-foreground">{inv.email}</span>
                          <form action={cancelInviteAction}>
                            <input type="hidden" name="id" value={inv.id} />
                            <button type="submit" className="text-xs text-destructive hover:underline">
                              Batalkan
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <form action={transferOwnershipAction} className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <input type="hidden" name="teamId" value={team.id} />
                  <label className="text-xs text-muted-foreground">Transfer ke email:</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="newowner@example.com"
                    className="input !w-auto max-w-[240px] !py-1 text-xs"
                  />
                  <button type="submit" className="btn-secondary !px-2.5 !py-1 text-xs">
                    Transfer ownership
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
