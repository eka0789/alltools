import { getCatalog, type ToolWithMeta } from "./data";

export interface SeoModifier {
  slug: string;
  label: string;
  adjective: string;
  descriptionSnippet: string;
  filter: (t: ToolWithMeta) => boolean;
}

export const SEO_MODIFIERS: SeoModifier[] = [
  {
    slug: "free",
    label: "Free",
    adjective: "free",
    descriptionSnippet: "Free-to-use, no credit card or subscription required",
    filter: (t) => t.pricing === "free",
  },
  {
    slug: "open-source",
    label: "Open Source",
    adjective: "open-source",
    descriptionSnippet: "Community-driven, transparent source code with permissive licenses",
    filter: (t) => Boolean(t.openSource),
  },
  {
    slug: "self-hosted",
    label: "Self-Hosted",
    adjective: "self-hosted",
    descriptionSnippet: "Host on your own servers, keeping data private and under your control",
    filter: (t) => Boolean(t.selfHosted),
  },
  {
    slug: "cli",
    label: "CLI",
    adjective: "command-line",
    descriptionSnippet: "Terminal-first tools built for scriptability and developer workflows",
    filter: (t) => t.platforms.includes("cli"),
  },
  {
    slug: "desktop",
    label: "Desktop",
    adjective: "desktop",
    descriptionSnippet: "Native desktop applications for focused, distraction-free work",
    filter: (t) => t.platforms.includes("desktop"),
  },
  {
    slug: "web",
    label: "Web-Based",
    adjective: "browser-based",
    descriptionSnippet: "Run directly in any modern browser without local installation",
    filter: (t) => t.platforms.includes("web"),
  },
];

export interface SeoLandingPage {
  categorySlug: string;
  categoryName: string;
  modifierSlug: string;
  modifierLabel: string;
  title: string;
  metaDescription: string;
  url: string;
  tools: ToolWithMeta[];
  total: number;
}

const MIN_TOOLS_THRESHOLD = 3;

export function getSeoLandingPages(): SeoLandingPage[] {
  const { tools, categories } = getCatalog();
  const activeTools = tools.filter((t) => t.status !== "deprecated");
  const pages: SeoLandingPage[] = [];

  for (const cat of categories) {
    const catTools = activeTools.filter((t) => t.categorySlug === cat.slug);
    for (const mod of SEO_MODIFIERS) {
      const matched = catTools.filter(mod.filter);
      if (matched.length >= MIN_TOOLS_THRESHOLD) {
        pages.push({
          categorySlug: cat.slug,
          categoryName: cat.name,
          modifierSlug: mod.slug,
          modifierLabel: mod.label,
          title: `Best ${mod.label} ${cat.name} Tools (${matched.length} Curated)`,
          metaDescription: `Discover the ${matched.length} best ${mod.adjective} tools for ${cat.name.toLowerCase()}. ${mod.descriptionSnippet}. Curated, compared, and updated for developers.`,
          url: `/best/${cat.slug}/${mod.slug}`,
          tools: matched,
          total: matched.length,
        });
      }
    }
  }

  return pages;
}

export function getSeoLandingPage(
  categorySlug: string,
  modifierSlug: string,
): SeoLandingPage | null {
  const { tools, categories } = getCatalog();
  const cat = categories.find((c) => c.slug === categorySlug);
  const mod = SEO_MODIFIERS.find((m) => m.slug === modifierSlug);
  if (!cat || !mod) return null;

  const activeTools = tools.filter((t) => t.status !== "deprecated");
  const matched = activeTools.filter(
    (t) => t.categorySlug === cat.slug && mod.filter(t),
  );

  if (matched.length < MIN_TOOLS_THRESHOLD) return null;

  return {
    categorySlug: cat.slug,
    categoryName: cat.name,
    modifierSlug: mod.slug,
    modifierLabel: mod.label,
    title: `Best ${mod.label} ${cat.name} Tools (${matched.length} Curated)`,
    metaDescription: `Discover the ${matched.length} best ${mod.adjective} tools for ${cat.name.toLowerCase()}. ${mod.descriptionSnippet}. Curated, compared, and updated for developers.`,
    url: `/best/${cat.slug}/${mod.slug}`,
    tools: matched,
    total: matched.length,
  };
}
