"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

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
            : data.status === "joined"
              ? "Anggota langsung aktif bergabung ke tim."
              : data.status === "invite-pending"
                ? "Undangan sudah ada — menunggu email itu login."
                : "Undangan terkirim. Anggota akan otomatis bergabung saat login pertama kali.",
        );
        setEmail("");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage(
          data.error === "seats-full"
            ? "Seat tim penuh (termasuk undangan pending)."
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
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && email && !busy) void invite();
          }}
          placeholder="email@anggota.com"
          type="email"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button type="button" onClick={invite} disabled={busy || !email} className="btn-primary sm:w-auto">
          {busy ? "Mengirim…" : "Invite anggota"}
        </button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

export function TeamRenameControl({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setEditing(false);
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Ganti nama tim"
      >
        <Pencil className="h-3 w-3" />
        Ubah nama
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-44 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
        maxLength={60}
      />
      <button type="button" onClick={save} disabled={busy || name.trim().length < 2} className="btn-primary !px-2.5 !py-1 text-xs">
        {busy ? "…" : "Simpan"}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="btn-secondary !px-2 !py-1 text-xs">
        Batal
      </button>
    </span>
  );
}

export function RemoveSeatButton({ email, label }: { email: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`${label} (${email})?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
      title={label}
    >
      <Trash2 className="h-3 w-3" />
      <span>{busy ? "…" : label}</span>
    </button>
  );
}
