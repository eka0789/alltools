"use client";

import { useState } from "react";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; status?: string; error?: string };
      if (data.ok) {
        setMessage(
          data.status === "already-member"
            ? "Email ini sudah menjadi anggota."
            : data.status === "invite-pending"
              ? "Undangan sudah ada — menunggu email itu login."
              : "Undangan terkirim. Anggota akan otomatis bergabung saat login pertama kali.",
        );
        setEmail("");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setMessage(
          data.error === "seats-full"
            ? "Seat tim penuh."
            : data.error === "invalid-email"
              ? "Email tidak valid."
              : "Gagal mengirim undangan.",
        );
      }
    } catch {
      setMessage("Gagal terhubung.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@anggota.com"
        type="email"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button type="button" onClick={invite} disabled={busy || !email} className="btn-secondary">
        {busy ? "…" : "Invite"}
      </button>
      {message && <span className="self-center text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
