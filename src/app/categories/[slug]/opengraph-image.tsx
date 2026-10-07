import { ImageResponse } from "next/og";
import { getCatalog } from "@/lib/data";
import { OgCard } from "@/components/og-card";

export const alt = "AllTools — curated tools in this category";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CategoryOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = getCatalog().categories.find((c) => c.slug === slug);

  return new ImageResponse(
    (
      <OgCard
        brandTagline="AllTools — The Developer Dictionary"
        title={cat?.name ?? "AllTools"}
        subtitle={cat ? "Category" : "The Developer Dictionary"}
        chips={cat ? [`${cat.toolCount} curated tools`] : undefined}
        description={
          cat?.description ??
          "Search hundreds of curated developer tools, resources and AI services."
        }
      />
    ),
    { ...size },
  );
}
