"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";

export interface SubmitState {
  error?: string;
}

export async function submitAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const name = get("name");
  const url = get("url");
  const description = get("description");
  const categorySlug = get("category");

  // Server-side validation: require the essentials, validate URL shape
  if (!name || !description || !categorySlug || !url) {
    return {
      error: "Please fill in the tool name, website, description and category.",
    };
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return { error: "The official website must be a valid http(s) URL." };
  }

  const githubUrl = get("githubUrl");
  const documentationUrl = get("documentationUrl");
  try {
    if (githubUrl) new URL(githubUrl);
    if (documentationUrl) new URL(documentationUrl);
  } catch {
    return { error: "The GitHub or documentation URL is not valid." };
  }

  try {
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
  } catch {
    return {
      error:
        "We couldn't save your submission right now. Please try again in a moment.",
    };
  }

  redirect("/submit?submitted=1");
}
