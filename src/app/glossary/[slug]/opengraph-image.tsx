import { ImageResponse } from "next/og";
import { getGlossaryTerm } from "@/data/glossary";
import { OgCard, ogTruncate } from "@/components/og-card";

export const alt = "AllTools Glossary — developer term explained";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function GlossaryOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);

  return new ImageResponse(
    (
      <OgCard
        brandTagline="AllTools — The Developer Dictionary"
        title={term ? `What is ${term.term}?` : "AllTools Glossary"}
        subtitle={term ? term.category : "The Developer Dictionary"}
        chips={term ? ["Developer Glossary"] : undefined}
        description={
          term
            ? ogTruncate(term.short, 140)
            : "Plain-language definitions of the terms developers meet every day."
        }
      />
    ),
    { ...size },
  );
}
