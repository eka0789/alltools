import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/data";
import SubmitForm from "./submit-form";

export const metadata: Metadata = {
  title: "Submit a Tool",
  description:
    "Submit a developer tool to the AllTools directory. Reviewed by a moderator before publishing.",
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const submitted = sp.submitted === "1";
  const { categories } = getCatalog();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Submit a Tool</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Know a great developer tool that is missing? Submit it below.
        Submissions are reviewed by a moderator before they appear in the
        directory.
      </p>

      {submitted ? (
        <div className="card mt-8 border-success/40 p-6 text-center">
          <p className="text-lg font-semibold">Thanks — submission received!</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your submission is now <strong>pending</strong> review. If approved,
            it will appear in the directory with a link back to its official
            website.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/" className="btn-secondary">Back to home</Link>
            <Link href="/submit" className="btn-primary">Submit another</Link>
          </div>
        </div>
      ) : (
        <SubmitForm
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      )}
    </div>
  );
}
