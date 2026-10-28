import { ImageResponse } from "next/og";
import { STACKS } from "@/lib/stacks";
import { OgCard } from "@/components/og-card";

export const alt = "AktifKoding — essential tools for this stack";
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
        brandTagline="AktifKoding — Developer Tools Pro"
        title={stack ? `${stack.name} Stack` : "AktifKoding"}
        subtitle={stack ? "Essential Toolbox" : "Developer Tools Pro"}
        description={
          stack?.description ??
          "The essential developer toolbox, curated per stack."
        }
      />
    ),
    { ...size },
  );
}
