import type { Metadata } from "next";
import { ApiDocsBuilder } from "./builder";

export const metadata: Metadata = {
  title: "API Docs Builder",
  description:
    "Ubah daftar endpoint menjadi dokumentasi Markdown dan spec OpenAPI 3.1 — dengan inference schema otomatis dari contoh JSON.",
  alternates: { canonical: "/generators/api-docs" },
};

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">API Docs Builder</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Isi endpoint, tempel contoh request/response JSON, dan dapatkan
          dokumentasi Markdown + spec OpenAPI 3.1 yang bisa langsung dipakai
          di Swagger UI atau Postman.
        </p>
      </header>
      <div className="mt-8">
        <ApiDocsBuilder />
      </div>
    </div>
  );
}
