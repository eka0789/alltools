import type { Metadata } from "next";
import { AiReviewClient } from "./client";

export const metadata: Metadata = {
  title: "AI Code Review",
  description:
    "Review kode berbantuan AI: deteksi keamanan, bug logika, performa, dan kejelasan. Gratis 3x sehari, tanpa batas untuk pengguna Pro.",
  alternates: { canonical: "/ai-review" },
};

export default function AiReviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">AI Code Review</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tempel cuplikan kode dan dapatkan review: kerentanan keamanan, bug
          logika, performa, dan kejelasan. Kode tidak disimpan — hanya diproses
          untuk review ini.
        </p>
      </header>
      <div className="mt-8">
        <AiReviewClient />
      </div>
    </div>
  );
}
