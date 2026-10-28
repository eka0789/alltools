"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Loader2, Lock } from "lucide-react";
import { downloadZip } from "@/lib/zip";

// Tombol unduh template: minta file map ke /api/templates/[slug]/download
// (server memeriksa entitlement), lalu zip di browser.
export function TemplateDownloadButton({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(slug)}/download`);
      if (res.status === 401) {
        router.push(`/login?next=/templates/${slug}`);
        return;
      }
      if (res.status === 402) {
        setError("Akses belum aktif — selesaikan pembelian dulu.");
        return;
      }
      if (!res.ok) {
        setError("Gagal mengunduh. Coba lagi.");
        return;
      }
      const data = (await res.json()) as { files: Record<string, string> };
      await downloadZip(data.files, `${slug}.zip`);
    } catch {
      setError("Gagal terhubung. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <Lock className="h-3.5 w-3.5" />
          {error}
        </p>
        <button type="button" onClick={download} className="btn-secondary w-full">
          Coba lagi
        </button>
        <Link href="/account" className="block text-center text-xs text-accent hover:underline">
          Cek status pembelian di akun
        </Link>
      </div>
    );
  }

  return (
    <button type="button" onClick={download} disabled={busy} className="btn-primary w-full">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Unduh template (ZIP)
    </button>
  );
}
