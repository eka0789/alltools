import { ImageResponse } from "next/og";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo-data";

export const alt = "AktifKoding — Developer Tools Pro";
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_LOGO_DATA_URI}
            width={96}
            height={96}
            style={{ objectFit: "cover", borderRadius: 24 }}
            alt="AktifKoding Logo"
          />
          <div style={{ fontSize: 56, fontWeight: 800 }}>AktifKoding</div>
        </div>
        <div style={{ fontSize: 34, color: "#818cf8", fontWeight: 600 }}>
          Developer Tools Pro — build faster, ship sooner
        </div>
        <div style={{ fontSize: 24, color: "#94a3b8" }}>
          Direktori tools · Generator · Template · AI code review
        </div>
      </div>
    ),
    { ...size },
  );
}
