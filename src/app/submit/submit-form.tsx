"use client";

import { useActionState } from "react";
import { submitAction, type SubmitState } from "./actions";

const initialState: SubmitState = {};

export default function SubmitForm({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(submitAction, initialState);

  const inputClass = "input";

  return (
    <form action={formAction} className="card mt-8 space-y-4 p-6">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
        >
          {state.error}
        </p>
      )}
      {/* Honeypot — hidden from humans, irresistible to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
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
      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? "Submitting…" : "Submit for review"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Only submit tools you have the right to promote. URLs are verified
        before publication.
      </p>
    </form>
  );
}
