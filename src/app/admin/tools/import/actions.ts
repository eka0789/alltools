"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, DB_IS_REMOTE } from "@/db/client";
import { tools } from "@/db/schema";
import { getAdminIdentity, logAudit, roleCan } from "@/lib/admin";
import { getCatalog, invalidateCatalog, normalizeUrlKey, refreshCatalogFromDb } from "@/lib/data";
import { safeHttpUrl } from "@/lib/url-check";
import { slugify } from "@/lib/slug";

async function requireCatalog() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");
}

// Minimal CSV line splitter: supports quoted cells and doubled quotes, no
// embedded newlines (admin paste-import, not a general-purpose CSV reader).
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((cell) => cell.trim());
}

const PRICING = new Set(["free", "freemium", "paid"]);

export async function importToolsAction(formData: FormData) {
  await requireCatalog();

  const raw = String(formData.get("csv") ?? "").trim();
  if (!raw) redirect("/admin/tools/import?error=empty");
  const dryRun = formData.get("dryRun") === "on";

  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) redirect("/admin/tools/import?error=empty");

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.includes("name") && header.includes("url");
  const col = (key: string, fallback: number) => {
    const index = header.indexOf(key);
    return index >= 0 ? index : fallback;
  };
  const body = hasHeader ? lines.slice(1) : lines;

  const catalog = getCatalog();
  const catBySlug = new Map(catalog.categories.map((c) => [c.slug, c]));
  const seenUrls = new Set(catalog.byUrl.keys());
  const usedSlugs = new Set(catalog.tools.map((t) => t.slug));

  // Soft-deleted rows still occupy unique slug/url indexes — include them so
  // an import never hits a hard unique-constraint failure.
  try {
    const existing = await db.select({ slug: tools.slug, url: tools.url }).from(tools);
    for (const row of existing) {
      usedSlugs.add(row.slug);
      seenUrls.add(normalizeUrlKey(row.url));
    }
  } catch {
    // catalog-only fallback
  }

  function uniqueSlug(name: string): string {
    const base = slugify(name) || "tool";
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    usedSlugs.add(slug);
    return slug;
  }

  let created = 0;
  let skipped = 0;
  let invalid = 0;
  const now = Date.now();

  for (const line of body) {
    const cells = splitCsvLine(line);
    const at = (key: string, fallback: number) => cells[col(key, fallback)] ?? "";
    const name = at("name", 0);
    const urlRaw = at("url", 1);
    const description = at("description", 2);
    const categorySlug = at("category", 3);
    const pricing = (at("pricing", 4) || "free").toLowerCase();
    const tagsRaw = at("tags", 5);

    const url = safeHttpUrl(urlRaw);
    const cat = catBySlug.get(categorySlug);
    if (!name || !url || !description || !cat || !PRICING.has(pricing)) {
      invalid += 1;
      continue;
    }

    const key = normalizeUrlKey(url);
    if (seenUrls.has(key)) {
      skipped += 1;
      continue;
    }

    if (!dryRun) {
      try {
        await db.insert(tools).values({
          name,
          slug: uniqueSlug(name),
          url,
          description,
          categoryId: cat.id,
          tags: JSON.stringify(
            tagsRaw
              .split("|")
              .map((tag) => tag.trim().toLowerCase())
              .filter(Boolean),
          ),
          pricing,
          createdAt: now,
          updatedAt: now,
          verified: false,
        });
      } catch {
        invalid += 1;
        continue;
      }
    }
    seenUrls.add(key);
    created += 1;
  }

  await logAudit(
    dryRun ? "tools.import_dry" : "tools.import",
    `tools:${created}`,
    `${dryRun ? "dry-run " : ""}created=${created} skipped=${skipped} invalid=${invalid}`,
  );
  invalidateCatalog();
  if (DB_IS_REMOTE) {
    try {
      await refreshCatalogFromDb();
    } catch {
      // TTL refresh will catch up
    }
  }
  revalidatePath("/admin/tools");
  revalidatePath("/");
  redirect(
    `/admin/tools/import?done=created-${created}-skipped-${skipped}-invalid-${invalid}${
      dryRun ? "&dry=1" : ""
    }`,
  );
}
