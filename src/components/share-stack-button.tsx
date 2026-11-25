"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Share2, X } from "lucide-react";

export function ShareStackButton({
  slugs,
  defaultTitle = "My Developer Stack",
  label = "Bagikan sebagai halaman publik",
}: {
  slugs: string[];
  defaultTitle?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [authorLabel, setAuthorLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (slugs.length === 0) return null;

  async function createShare(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stacks/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, authorLabel, slugs }),
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(
          data.error === "title-too-short"
            ? "Judul stack minimal 2 karakter."
            : "Gagal membuat link bagikan. Coba lagi.",
        );
        return;
      }
      setShareUrl(`${window.location.origin}${data.url}`);
    } catch {
      setError("Gagal terhubung. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary !py-1.5 text-xs"
      >
        <Share2 className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }

  return (
    <div className="card mt-3 max-w-md p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">Bagikan Stack Publik ({slugs.length} tool)</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setShareUrl(null);
            setError(null);
          }}
          aria-label="Tutup"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {shareUrl ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-success">Link publik berhasil dibuat!</p>
          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={shareUrl}
              className="input !py-1.5 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => void copyLink()}
              className="btn-primary shrink-0 !px-2.5 !py-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <Link
            href={new URL(shareUrl).pathname}
            className="inline-block text-xs text-accent hover:underline"
          >
            Buka halaman stack →
          </Link>
        </div>
      ) : (
        <form onSubmit={createShare} className="mt-3 space-y-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul stack (mis. Next.js SaaS Starter)"
            required
            className="input !py-1.5 text-xs"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat (opsional)"
            className="input !py-1.5 text-xs"
          />
          <input
            value={authorLabel}
            onChange={(e) => setAuthorLabel(e.target.value)}
            placeholder="Nama kamu (opsional)"
            className="input !py-1.5 text-xs"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full !py-1.5 text-xs">
            {busy ? "Membuat link…" : "Buat link publik"}
          </button>
        </form>
      )}
    </div>
  );
}
