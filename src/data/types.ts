export type Pricing = "free" | "freemium" | "paid";

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  home?: boolean; // show on homepage "Browse Categories"
  subs?: { slug: string; name: string }[];
}

export interface SeedTool {
  n: string; // name
  u: string; // official url
  c: string; // category slug
  s?: string; // subcategory slug
  slug?: string; // explicit slug override (when name slugifies poorly)
  d: string; // short description
  t?: string[]; // tags
  p?: Pricing;
  oss?: boolean; // open source
  sh?: boolean; // self-hostable
  gh?: string; // github url
  docs?: string; // documentation url
  plat?: string[]; // platforms: web | desktop | cli | mobile | extension
  langs?: string[]; // languages
  fw?: string[]; // frameworks
  use?: string[]; // use cases
  alt?: string[]; // alternative tool slugs
  rel?: string[]; // related tool slugs
  feat?: boolean; // featured on homepage
  install?: string; // official install/getting-started command (verifiable)
  pros?: string[]; // editorial strengths (top tools)
  cons?: string[]; // editorial trade-offs / when NOT to use
}

export const PRICING_LABEL: Record<Pricing, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
};

export const PLATFORMS = [
  "web",
  "desktop",
  "cli",
  "mobile",
  "extension",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  web: "Web",
  desktop: "Desktop",
  cli: "CLI",
  mobile: "Mobile",
  extension: "Extension",
};
