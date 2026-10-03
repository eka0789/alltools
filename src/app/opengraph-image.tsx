import { ImageResponse } from "next/og";

export const alt = "AllTools — The Developer Dictionary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function RootOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          background: "linear-gradient(135deg, #0b0d12 0%, #1a2033 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            A
          </div>
          <div style={{ fontSize: 56, fontWeight: 800 }}>AllTools</div>
        </div>
        <div style={{ fontSize: 34, color: "#818cf8", fontWeight: 600 }}>
          Everything developers need, in one place
        </div>
        <div style={{ fontSize: 24, color: "#94a3b8" }}>
          Tools · Resources · AI services · Curated collections
        </div>
      </div>
    ),
    { ...size },
  );
}
