import type { Metadata } from "next";
import { BoilerplateGenerator } from "./generator";

export const metadata: Metadata = {
  title: "Boilerplate Generator",
  description:
    "Rakit proyek Next.js, Vite, Express, Hono, atau FastAPI lengkap dengan database, auth, Docker, dan tests. Unduh ZIP siap jalan.",
  alternates: { canonical: "/generators/boilerplate" },
};

export default function BoilerplatePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Boilerplate Generator</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Pilih stack dan opsi, lihat pratinjau struktur file, lalu unduh ZIP.
          Seluruh file dibuat di browser Anda — tidak ada yang dikirim ke server.
        </p>
      </header>
      <div className="mt-8">
        <BoilerplateGenerator />
      </div>
    </div>
  );
}
