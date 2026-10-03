"use client";

import { useEffect, useState } from "react";

export interface BulkTool {
  slug: string;
  name: string;
  url: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  pricing: string;
  openSource: boolean;
  selfHosted: boolean;
  platforms: string[];
  languages: string[];
  frameworks: string[];
  githubUrl: string | null;
  documentationUrl: string | null;
  githubStars: number | null;
}

// Shared fetcher for client pages that resolve slugs (favorites, compare,
// recently-viewed) through /api/tools/bulk. State updates happen only in
// async callbacks; `loading` is derived from key freshness.
export function useBulkTools(slugs: string[]): { tools: BulkTool[]; loading: boolean } {
  const slugKey = slugs.join(",");
  const [result, setResult] = useState<{ key: string; tools: BulkTool[] }>({
    key: "",
    tools: [],
  });

  useEffect(() => {
    if (slugs.length === 0) return;
    const controller = new AbortController();
    fetch(`/api/tools/bulk?slugs=${encodeURIComponent(slugKey)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: BulkTool[] }) =>
        setResult({ key: slugKey, tools: data.items ?? [] }),
      )
      .catch(() => setResult({ key: slugKey, tools: [] }));
    return () => controller.abort();
    // slugKey is the identity of the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey]);

  const tools = result.key === slugKey ? result.tools : [];
  const loading = slugs.length > 0 && result.key !== slugKey;
  return { tools, loading };
}
