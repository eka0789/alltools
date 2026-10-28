import type { Metadata } from "next";
import { DeploymentGenerator } from "./generator";

export const metadata: Metadata = {
  title: "Deployment Config Generator",
  description:
    "Hasilkan Dockerfile, docker-compose, GitHub Actions CI/CD, dan reverse proxy Nginx/Caddy untuk target Vercel, VPS Docker, atau VPS PM2.",
  alternates: { canonical: "/generators/deployment" },
};

export default function DeploymentPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Deployment Config Generator</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Pilih stack, target, dan database — hasilkan Dockerfile, docker-compose,
          CI/CD GitHub Actions, dan konfigurasi reverse proxy dengan TLS.
        </p>
      </header>
      <div className="mt-8">
        <DeploymentGenerator />
      </div>
    </div>
  );
}
