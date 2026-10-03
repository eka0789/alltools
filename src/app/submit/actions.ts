"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getCatalog } from "@/lib/data";
import { rateLimit } from "@/lib/rate-limit";
import { safeHttpUrl } from "@/lib/url-check";

export interface SubmitState {
  error?: string;
}

export async function submitAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  // Honeypot: a hidden field real users never fill. If it is filled, the
  // "submitter" is a bot — pretend everything worked and drop the row.
  if (get("company")) {
    redirect("/submit?submitted=1");
  }

  // Server-side validation: require the essentials, validate URL shape
  const name = get("name");
  const url = get("url");
  const description = get("description");
  const categorySlug = get("category");

  if (!name || !description || !categorySlug || !url) {
    return {
      error: "Please fill in the tool name, website, description and category.",
    };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(`submit:${ip}`, 5, 60 * 60 * 1000).ok) {
    return {
      error: "Too many submissions from your network this hour. Please try again later.",
    };
  }

  const parsedUrl = safeHttpUrl(url);
  if (!parsedUrl) {
    return { error: "The official website must be a valid http(s) URL." };
  }

  const githubUrl = safeHttpUrl(get("githubUrl"));
  const documentationUrl = safeHttpUrl(get("documentationUrl"));
  if ((get("githubUrl") && !githubUrl) || (get("documentationUrl") && !documentationUrl)) {
    return { error: "The GitHub or documentation URL must be a valid http(s) URL." };
  }

  // The category must exist in the catalog, otherwise the submission could
  // never be approved into a real category.
  const catalog = getCatalog();
  if (!catalog.categories.some((c) => c.slug === categorySlug)) {
    return { error: "Please pick a valid category." };
  }

  // Duplicate detection: same website already listed or already waiting
  // for review.
  if (catalog.byUrl.has(parsedUrl)) {
    return {
      error: "This website is already listed in the directory.",
    };
  }
  try {
    const pending = await db
      .select({ url: submissions.url })
      .from(submissions)
      .where(eq(submissions.status, "pending"));
    if (pending.some((s) => s.url === parsedUrl)) {
      return {
        error: "A submission for this website is already awaiting review.",
      };
    }
  } catch {
    // DB unavailable — let the insert below surface the real problem.
  }

  try {
    await db.insert(submissions).values({
      name: name.slice(0, 120),
      url: parsedUrl,
      description: description.slice(0, 500),
      categorySlug,
      githubUrl: githubUrl,
      documentationUrl: documentationUrl,
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
  } catch {
    return {
      error:
        "We couldn't save your submission right now. Please try again in a moment.",
    };
  }

  redirect("/submit?submitted=1");
}
