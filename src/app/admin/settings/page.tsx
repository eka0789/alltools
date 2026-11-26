import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { getAnnouncement, isAiReviewEnabled, isCheckoutEnabled } from "@/lib/settings";
import { updateSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "system")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const checkoutEnabled = await isCheckoutEnabled();
  const aiReviewEnabled = await isAiReviewEnabled();
  const announcement = await getAnnouncement();

  return (
    <div className="py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Feature flags operasional. Perubahan langsung berlaku tanpa deploy.
        </p>
      </div>

      {sp.ok && (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Settings disimpan.
        </p>
      )}

      <form action={updateSettingsAction} className="card mt-6 space-y-5 p-6">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="checkoutEnabled"
            defaultChecked={checkoutEnabled}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium">Checkout aktif</span>
            <span className="block text-xs text-muted-foreground">
              Bila dimatikan, <code className="rounded bg-muted px-1 py-0.5">POST /api/checkout</code>{" "}
              mengembalikan 503 — berguna saat DOKU bermasalah atau promo ditutup.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="aiReviewEnabled"
            defaultChecked={aiReviewEnabled}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium">AI Code Review aktif</span>
            <span className="block text-xs text-muted-foreground">
              Bila dimatikan, <code className="rounded bg-muted px-1 py-0.5">POST /api/review</code>{" "}
              mengembalikan 503 — kill switch untuk biaya LLM / abuse.
            </span>
          </span>
        </label>

        <div className="space-y-3 border-t border-border pt-4">
          <span className="block text-sm font-medium">Banner pengumuman (publik)</span>
          <p className="text-xs text-muted-foreground">
            Tampil di atas navbar untuk pengunjung (bukan admin). Kosongkan untuk
            menyembunyikan. Perubahan terlihat dalam ±60 detik.
          </p>
          <textarea
            name="announcement"
            defaultValue={announcement.text}
            maxLength={300}
            rows={2}
            placeholder="Contoh: Promo Pro Lifetime 199rb berlaku sampai akhir bulan."
            className="input text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Level
            <select name="announcementLevel" defaultValue={announcement.level} className="input !w-auto !py-1 text-xs">
              <option value="info">Info</option>
              <option value="warning">Peringatan</option>
              <option value="success">Sukses</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <button type="submit" className="btn-primary">Simpan</button>
        </div>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        Flag disimpan di tabel <code className="rounded bg-muted px-1 py-0.5">site_settings</code>{" "}
        dan dibaca via <code className="rounded bg-muted px-1 py-0.5">getSetting()</code>. Banner
        dirender oleh client component sehingga halaman tetap ISR/statis.
      </p>
    </div>
  );
}
