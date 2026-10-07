import { ImageResponse } from "next/og";
import { STACKS } from "@/lib/stacks";
import { OgCard } from "@/components/og-card";

export const alt = "AllTools — essential tools for this stack";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function StackOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stack = STACKS.find((s) => s.slug === slug);

  return new ImageResponse(
    (
      <OgCard
        brandTagline="AllTools — The Developer Dictionary"
        title={stack ? `${stack.name} Stack` : "AllTools"}
        subtitle={stack ? "Essential Toolbox" : "The Developer Dictionary"}
        description={
          stack?.description ??
          "The essential developer toolbox, curated per stack."
        }
      />
    ),
    { ...size },
  );
}
