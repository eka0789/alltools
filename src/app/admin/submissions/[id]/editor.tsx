"use client";

import { useState } from "react";
import {
  suggestSubmissionMetaAction,
  updateSubmissionAndApproveAction,
  type MetaSuggestion,
} from "../../actions";

interface Props {
  submission: {
    id: number;
    name: string;
    url: string;
    description: string;
    categorySlug: string;
    pricing: string;
    tags: string;
    githubUrl: string | null;
    documentationUrl: string | null;
  };
  categories: { slug: string; name: string }[];
  error?: string;
}

export function SubmissionEditor({ submission, categories, error }: Props) {
  const [name, setName] = useState(submission.name);
  const [description, setDescription] = useState(submission.description);
  const [categorySlug, setCategorySlug] = useState(submission.categorySlug);
  const [tags, setTags] = useState(() => {
    try {
      const parsed = JSON.parse(submission.tags);
      return Array.isArray(parsed) ? parsed.join(", ") : "";
    } catch {
      return "";
    }
  });
  const [suggestion, setSuggestion] = useState<MetaSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function suggest() {
    setLoading(true);
    setMessage("");
    try {
      const result = await suggestSubmissionMetaAction(name, description);
      setSuggestion(result);
      if (result.categories.length === 0 && result.tags.length === 0) {
        setMessage("Tidak ada saran yang cocok.");
      }
    } catch {
      setMessage("Gagal memuat saran.");
    } finally {
      setLoading(false);
    }
  }

  function appendTag(tag: string) {
    const current = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!current.includes(tag)) current.push(tag);
    setTags(current.join(", "));
  }

  return (
    <form action={updateSubmissionAndApproveAction} className="card space-y-5 p-6">
      <input type="hidden" name="id" value={submission.id} />

      {error && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          {error === "validation" && "Data belum lengkap / URL tidak valid."}
          {error === "category" && "Kategori tidak ditemukan."}
          {error === "duplicate" && "URL sudah terdaftar pada tool lain."}
          {error === "url" && "URL tidak valid."}
          {error === "save" && "Gagal menyimpan tool (slug duplikat?)."}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Edit &amp; Approve</h2>
        <button
          type="button"
          onClick={suggest}
          disabled={loading}
          className="btn-secondary text-xs"
        >
          {loading ? "Meminta saran…" : "✨ Saran AI"}
        </button>
      </div>

      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      {suggestion && (suggestion.categories.length > 0 || suggestion.tags.length > 0) && (
        <div className="rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-xs">
          <p className="font-medium">
            Saran ({suggestion.source === "llm" ? "LLM" : "heuristik"}):
          </p>
          {suggestion.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestion.categories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategorySlug(c.slug)}
                  className="rounded-full bg-accent px-2.5 py-0.5 text-accent-foreground"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {suggestion.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestion.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => appendTag(tag)}
                  className="rounded-full bg-background px-2.5 py-0.5 text-muted-foreground hover:text-foreground"
                >
                  + {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Name *</span>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">URL *</span>
          <input name="url" type="url" required defaultValue={submission.url} className="input" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Description *</span>
        <textarea
          name="description"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Category *</span>
          <select
            name="categorySlug"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Pricing</span>
          <select name="pricing" defaultValue={submission.pricing} className="input">
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Tags</span>
        <input
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="comma separated, lowercase"
          className="input"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">GitHub URL</span>
          <input name="githubUrl" type="url" defaultValue={submission.githubUrl ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Documentation URL</span>
          <input
            name="documentationUrl"
            type="url"
            defaultValue={submission.documentationUrl ?? ""}
            className="input"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button type="submit" className="btn-primary">Approve &amp; publish</button>
      </div>
    </form>
  );
}
