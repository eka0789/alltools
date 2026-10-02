import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getCatalog } from "@/lib/data";

export const metadata: Metadata = {
  title: "Submit a Tool",
  description:
    "Submit a developer tool to the AllTools directory. Reviewed by a moderator before publishing.",
  alternates: { canonical: "/submit" },
};

async function submitAction(formData: FormData) {
  "use server";

  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const name = get("name");
  const url = get("url");
  const description = get("description");
  const categorySlug = get("category");

  // Server-side validation: require the essentials, validate URL shape
  if (!name || !description || !categorySlug) return;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return;
  } catch {
    return;
  }

  const githubUrl = get("githubUrl");
  const documentationUrl = get("documentationUrl");
  try {
    if (githubUrl) new URL(githubUrl);
    if (documentationUrl) new URL(documentationUrl);
  } catch {
    return;
  }

  await db.insert(submissions).values({
    name: name.slice(0, 120),
    url: parsedUrl.toString(),
    description: description.slice(0, 500),
    categorySlug,
    githubUrl: githubUrl || null,
    documentationUrl: documentationUrl || null,
    pricing: ["free", "freemium", "paid"].includes(get("pricing"))
      ? get("pricing")
      : "free",
    tags: JSON.stringify(
      get("tags")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8),
    ),
    createdAt: Date.now(),
  });

  redirect("/submit?submitted=1");
}

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const submitted = sp.submitted === "1";
  const { categories } = getCatalog();

  const inputClass = "input";

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
        <form action={submitAction} className="card mt-8 space-y-4 p-6">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Tool name *
            </label>
            <input id="name" name="name" required maxLength={120} className={inputClass} placeholder="e.g. Hoppscotch" />
          </div>
          <div>
            <label htmlFor="url" className="mb-1.5 block text-sm font-medium">
              Official website *
            </label>
            <input id="url" name="url" type="url" required className={inputClass} placeholder="https://example.com" />
          </div>
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
              Short description *
            </label>
            <textarea id="description" name="description" required maxLength={500} rows={3} className={inputClass} placeholder="What does the tool do? One or two sentences." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium">
                Category *
              </label>
              <select id="category" name="category" required className={inputClass} defaultValue="">
                <option value="" disabled>Select a category</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pricing" className="mb-1.5 block text-sm font-medium">
                Pricing
              </label>
              <select id="pricing" name="pricing" className={inputClass} defaultValue="free">
                <option value="free">Free</option>
                <option value="freemium">Freemium</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="githubUrl" className="mb-1.5 block text-sm font-medium">
                GitHub repository
              </label>
              <input id="githubUrl" name="githubUrl" type="url" className={inputClass} placeholder="https://github.com/..." />
            </div>
            <div>
              <label htmlFor="documentationUrl" className="mb-1.5 block text-sm font-medium">
                Documentation URL
              </label>
              <input id="documentationUrl" name="documentationUrl" type="url" className={inputClass} placeholder="https://docs.example.com" />
            </div>
          </div>
          <div>
            <label htmlFor="tags" className="mb-1.5 block text-sm font-medium">
              Tags <span className="font-normal text-muted-foreground">(comma separated)</span>
            </label>
            <input id="tags" name="tags" className={inputClass} placeholder="api, testing, open-source" />
          </div>
          <button type="submit" className="btn-primary w-full">
            Submit for review
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Only submit tools you have the right to promote. URLs are verified
            before publication.
          </p>
        </form>
      )}
    </div>
  );
}
