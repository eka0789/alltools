import { redirect } from "next/navigation";
import { getAdminIdentity, listAdminSessions, roleCan } from "@/lib/admin";
import { revokeSessionAction } from "./actions";

export const dynamic = "force-dynamic";

function fmt(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nowMs(): number {
  return Date.now();
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const sessions = await listAdminSessions();
  const now = nowMs();

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sesi login admin yang dapat dicabut. Sesi berlaku 7 hari per perangkat; cookie lama
          (token digest) tetap kompatibel tetapi tidak dapat dicabut dari sini.
        </p>
      </div>

      {sp.ok === "revoked" && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Sesi dicabut.
        </p>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Terakhir aktif</th>
              <th className="px-4 py-3">Kedaluwarsa</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada sesi server-side (login baru akan tercatat di sini).
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{session.actor}</span>
                    <span className="block max-w-[260px] truncate text-[10px] text-muted-foreground">
                      {session.userAgent ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{session.role}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{session.ip ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {fmt(session.lastSeenAt)}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className={session.expiresAt < now ? "text-warning" : "text-muted-foreground"}>
                      {fmt(session.expiresAt)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={revokeSessionAction}>
                      <input type="hidden" name="id" value={session.id} />
                      <button type="submit" className="btn-secondary !px-2 !py-1 text-xs text-destructive">
                        Revoke
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
