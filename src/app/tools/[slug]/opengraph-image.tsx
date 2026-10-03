import { ImageResponse } from "next/og";
import { getToolBySlug } from "@/lib/data";

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

  const name = tool?.name ?? "AllTools";
  const category = tool?.categoryName ?? "The Developer Dictionary";
  const rawDesc = tool?.description ?? "Search hundreds of curated developer tools.";
  const description =
    rawDesc.length > 120 ? `${rawDesc.slice(0, 120)}…` : rawDesc;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0d12 0%, #1a2033 100%)",
          padding: 64,
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            A
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, color: "#94a3b8" }}>
            AllTools — The Developer Dictionary
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#818cf8", fontWeight: 600 }}>
            {category}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#94a3b8", lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
    ),
    { ...size },
  );
}
