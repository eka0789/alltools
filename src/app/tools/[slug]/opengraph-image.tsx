import { ImageResponse } from "next/og";
import { getToolBySlug } from "@/lib/data";
import { PRICING_LABEL } from "@/data/types";
import { OgCard } from "@/components/og-card";

export const alt = "AllTools — developer tool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Per-tool OG image, rendered at request/build time from catalog data.
export default async function ToolOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  let host = "";
  try {
    host = new URL(tool?.url ?? "").host;
  } catch {
    // unparseable url — chip is simply omitted
  }

  const pricingLabel =
    tool?.pricing && tool.pricing in PRICING_LABEL
      ? PRICING_LABEL[tool.pricing as keyof typeof PRICING_LABEL]
      : "";

  const chips: string[] = [];
  if (host) chips.push(host);
  if (pricingLabel) chips.push(pricingLabel);
  if (tool?.openSource) chips.push("Open source");

  return new ImageResponse(
    (
      <OgCard
        brandTagline="AllTools — The Developer Dictionary"
        title={tool?.name ?? "AllTools"}
        subtitle={tool?.categoryName ?? "The Developer Dictionary"}
        chips={chips}
        description={
          tool?.description ??
          "Search hundreds of curated developer tools, resources and AI services."
        }
      />
    ),
    { ...size },
  );
}
