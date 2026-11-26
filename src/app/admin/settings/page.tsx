import { redirect } from "next/navigation";
import { getAdminIdentity, roleCan } from "@/lib/admin";
import { isAiReviewEnabled, isCheckoutEnabled } from "@/lib/settings";
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

        <div className="flex justify-end border-t border-border pt-4">
          <button type="submit" className="btn-primary">Simpan</button>
        </div>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        Catatan: banner/maintenance global belum di-wire ke halaman publik agar ISR tetap
        statis. Flag disimpan di tabel <code className="rounded bg-muted px-1 py-0.5">site_settings</code>{" "}
        dan bisa dibaca via <code className="rounded bg-muted px-1 py-0.5">getSetting()</code>.
      </p>
    </div>
  );
}
