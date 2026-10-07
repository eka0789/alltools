import Link from "next/link";
import { getCatalog } from "@/lib/data";
import type { ToolWithMeta } from "@/lib/data";
import { saveToolAction } from "../actions";
import { CategorySubcategoryFields } from "./subcategory-select";

const PLATFORMS = ["web", "desktop", "cli", "mobile", "extension"];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ToolForm({ tool }: { tool?: ToolWithMeta }) {
  const { categories, subcategories } = getCatalog();

  return (
    <form action={saveToolAction} className="card space-y-5 p-6">
      {tool && <input type="hidden" name="id" value={tool.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name *">
          <input name="name" required maxLength={120} defaultValue={tool?.name} className="input" />
        </Field>
        <Field label="Slug" hint="Leave empty to generate from name.">
          <input name="slug" defaultValue={tool?.slug} className="input" placeholder="auto" />
        </Field>
      </div>

      <Field label="Official URL *">
        <input name="url" type="url" required defaultValue={tool?.url} className="input" />
      </Field>

      <Field label="Description *" hint="One or two sentences, shown on cards and search results.">
        <textarea name="description" required maxLength={500} rows={2} defaultValue={tool?.description} className="input" />
      </Field>

      <CategorySubcategoryFields
        categories={categories}
        subcategories={subcategories}
        initialCategoryId={tool?.categoryId}
        initialSubcategoryId={tool?.subcategoryId}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pricing">
          <select name="pricing" defaultValue={tool?.pricing ?? "free"} className="input">
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="GitHub URL">
          <input name="githubUrl" type="url" defaultValue={tool?.githubUrl ?? ""} className="input" />
        </Field>
        <Field label="Documentation URL">
          <input name="documentationUrl" type="url" defaultValue={tool?.documentationUrl ?? ""} className="input" />
        </Field>
      </div>

      <Field label="Install command" hint="Official one-liner shown with a copy button, e.g. npm install express. Leave empty when none exists.">
        <input name="installCommand" defaultValue={tool?.installCommand ?? ""} className="input" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tags" hint="Comma separated, lowercase.">
          <input name="tags" defaultValue={tool?.tags.join(", ")} className="input" />
        </Field>
        <Field label="Languages" hint="Comma separated, e.g. typescript, python.">
          <input name="languages" defaultValue={tool?.languages.join(", ")} className="input" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Frameworks" hint="Comma separated, e.g. react, next.js.">
          <input name="frameworks" defaultValue={tool?.frameworks.join(", ")} className="input" />
        </Field>
        <Field label="Alternatives" hint="Tool slugs, comma separated.">
          <input name="alternatives" defaultValue={tool?.alternatives.join(", ")} className="input" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Related tools" hint="Tool slugs, comma separated.">
          <input name="relatedTools" defaultValue={tool?.relatedTools.join(", ")} className="input" />
        </Field>
        <Field label="Use cases" hint="One per line.">
          <textarea name="useCases" rows={3} defaultValue={tool?.useCases.join("\n")} className="input" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pros (strengths)" hint="One per line, max 5. Honest decision aids.">
          <textarea name="pros" rows={4} defaultValue={tool?.pros?.join("\n") ?? ""} className="input" />
        </Field>
        <Field label="Cons (trade-offs)" hint="One per line, max 5. Include when NOT to use it.">
          <textarea name="cons" rows={4} defaultValue={tool?.cons?.join("\n") ?? ""} className="input" />
        </Field>
      </div>

      <Field label="Platforms">
        <div className="flex flex-wrap gap-4">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-1.5 text-sm capitalize">
              <input
                type="checkbox"
                name={`platform-${p}`}
                defaultChecked={tool?.platforms.includes(p)}
                className="h-4 w-4"
              />
              {p}
            </label>
          ))}
        </div>
      </Field>

      <div className="flex flex-wrap gap-4 border-t border-border pt-5">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="openSource" defaultChecked={tool?.openSource} className="h-4 w-4" />
          Open source
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="selfHosted" defaultChecked={tool?.selfHosted} className="h-4 w-4" />
          Self-hostable
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="featured" defaultChecked={tool?.featured} className="h-4 w-4" />
          Featured
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="verified" defaultChecked={tool?.verified} className="h-4 w-4" />
          Verified
        </label>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm">
            Status
            <select name="status" defaultValue={tool?.status ?? "active"} className="input !w-auto">
              <option value="active">active</option>
              <option value="needs_review">needs_review</option>
              <option value="deprecated">deprecated</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/admin/tools" className="btn-secondary">Cancel</Link>
        <button type="submit" className="btn-primary">
          {tool ? "Save changes" : "Create tool"}
        </button>
      </div>
    </form>
  );
}
