import { getCatalog, type ToolWithMeta } from "@/lib/data";

export interface ComparePair {
  pair: string;
  toolA: ToolWithMeta;
  toolB: ToolWithMeta;
}

export function canonicalCompareSlug(slugA: string, slugB: string): string {
  return [slugA, slugB].sort((a, b) => a.localeCompare(b)).join("-vs-");
}

// Parses `<slugA>-vs-<slugB>` safely even when individual slugs contain hyphens.
export function parseComparePair(rawPair: string): (ComparePair & { isCanonical: boolean }) | null {
  const { bySlug } = getCatalog();
  const marker = "-vs-";
  let idx = rawPair.indexOf(marker);

  while (idx !== -1) {
    const left = rawPair.slice(0, idx);
    const right = rawPair.slice(idx + marker.length);
    if (left && right && left !== right) {
      const toolA = bySlug.get(left);
      const toolB = bySlug.get(right);
      if (toolA && toolB && toolA.status !== "deprecated" && toolB.status !== "deprecated") {
        const canonical = canonicalCompareSlug(toolA.slug, toolB.slug);
        const [orderedA, orderedB] =
          toolA.slug.localeCompare(toolB.slug) <= 0 ? [toolA, toolB] : [toolB, toolA];
        return {
          pair: canonical,
          toolA: orderedA,
          toolB: orderedB,
          isCanonical: rawPair === canonical,
        };
      }
    }
    idx = rawPair.indexOf(marker, idx + 1);
  }
  return null;
}

// Generates the highest-value unique comparison pairs from curated `alternatives`.
export function getTopComparePairs(limit = 120): ComparePair[] {
  const { tools, bySlug } = getCatalog();
  const active = tools.filter((t) => t.status !== "deprecated");
  const seen = new Set<string>();
  const scored: { score: number; item: ComparePair }[] = [];

  for (const t of active) {
    for (const altSlug of t.alternatives) {
      if (altSlug === t.slug) continue;
      const alt = bySlug.get(altSlug);
      if (!alt || alt.status === "deprecated") continue;
      const pair = canonicalCompareSlug(t.slug, alt.slug);
      if (seen.has(pair)) continue;
      seen.add(pair);

      const [toolA, toolB] = t.slug.localeCompare(alt.slug) <= 0 ? [t, alt] : [alt, t];
      const score =
        (toolA.featured ? 1000 : 0) +
        (toolB.featured ? 1000 : 0) +
        Math.log10((toolA.githubStars ?? 1) + 1) * 50 +
        Math.log10((toolB.githubStars ?? 1) + 1) * 50 +
        (toolA.pros.length > 0 ? 100 : 0) +
        (toolB.pros.length > 0 ? 100 : 0);
      scored.push({ score, item: { pair, toolA, toolB } });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.item.pair.localeCompare(b.item.pair));
  return scored.slice(0, limit).map((s) => s.item);
}
