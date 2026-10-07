import { ImageResponse } from "next/og";
import { COLLECTIONS } from "@/data/collections";
import { getToolBySlug } from "@/lib/data";
import { OgCard, ogTruncate } from "@/components/og-card";

export const alt = "AllTools — curated collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CollectionOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = COLLECTIONS.find((c) => c.slug === slug);

  // Same validation rule as the page itself: unknown slugs are dropped.
  const toolCount = collection
    ? collection.tools.filter((s) => getToolBySlug(s)).length
    : 0;

  return new ImageResponse(
    (
      <OgCard
        brandTagline="AllTools — The Developer Dictionary"
        title={collection ? `${collection.emoji} ${collection.title}` : "AllTools"}
        subtitle={collection ? "Curated Collection" : "The Developer Dictionary"}
        chips={collection ? [`${toolCount} hand-picked tools`] : undefined}
        description={
          collection
            ? ogTruncate(collection.tagline || collection.description)
            : "Search hundreds of curated developer tools, resources and AI services."
        }
      />
    ),
    { ...size },
  );
}
