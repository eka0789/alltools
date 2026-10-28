import type { Metadata } from "next";
import Link from "next/link";
import { FileCode2, FileCog, Rocket, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "Generators",
  description:
    "Generator boilerplate proyek, pembuat dokumentasi API, dan generator konfigurasi deployment — gratis dipakai langsung di browser.",
  alternates: { canonical: "/generators" },
};

const TOOLS = [
  {
    href: "/generators/boilerplate",
    icon: Rocket,
    title: "Boilerplate Generator",
    desc: "Rakit proyek Next.js, Vite, Express, Hono, atau FastAPI dengan database, auth, Docker, dan tests — unduh sebagai ZIP siap jalan.",
  },
  {
    href: "/generators/api-docs",
    icon: FileCode2,
    title: "API Docs Builder",
    desc: "Ubah daftar endpoint menjadi dokumentasi Markdown dan spec OpenAPI 3.1 — lengkap dengan inference schema dari contoh JSON.",
  },
  {
    href: "/generators/deployment",
    icon: FileCog,
    title: "Deployment Config Generator",
    desc: "Dockerfile, docker-compose, GitHub Actions, dan reverse proxy (Nginx/Caddy) untuk target Vercel, VPS Docker, atau VPS PM2.",
  },
];

export default function GeneratorsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Wrench className="h-3 w-3 text-accent" />
          Gratis — jalan sepenuhnya di browser Anda
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Generator</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Kode Anda tidak pernah dikirim ke server: seluruh konfigurasi dan file
          dihasilkan lokal di browser, tinggal unduh atau salin.
        </p>
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="card flex flex-col p-6 transition-colors hover:border-accent/40">
            <t.icon className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-sm font-semibold">{t.title}</h2>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
            <span className="mt-4 text-sm text-accent">Buka →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
