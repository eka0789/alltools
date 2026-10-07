import React from "react";

// Shared layout for generated Open Graph cards (1200×630, dark theme).
// Satori renders a strict flexbox subset: every container div needs
// `display: flex`, no CSS grid, no shorthand padding — keep styles explicit.

const COLORS = {
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#818cf8",
  chipBg: "rgba(99, 102, 241, 0.14)",
  chipBorder: "rgba(129, 140, 248, 0.35)",
  chipText: "#c7d2fe",
};

export function ogTruncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function titleSize(title: string): number {
  if (title.length > 44) return 44;
  if (title.length > 30) return 54;
  return 72;
}

export function OgBrand({ tagline }: { tagline: string }) {
  return (
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
      <div style={{ fontSize: 26, fontWeight: 600, color: COLORS.muted }}>
        {tagline}
      </div>
    </div>
  );
}

export function OgChip({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 24,
        paddingRight: 24,
        borderRadius: 999,
        background: COLORS.chipBg,
        border: `1px solid ${COLORS.chipBorder}`,
        color: COLORS.chipText,
        fontSize: 24,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

interface OgCardProps {
  brandTagline: string;
  title: string;
  subtitle?: string;
  chips?: string[];
  description?: string;
}

export function OgCard({
  brandTagline,
  title,
  subtitle,
  chips,
  description,
}: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0b0d12 0%, #1a2033 100%)",
        padding: 64,
        color: COLORS.text,
        fontFamily: "sans-serif",
      }}
    >
      <OgBrand tagline={brandTagline} />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            fontSize: titleSize(title),
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: COLORS.accent,
              fontWeight: 600,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {chips && chips.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {chips.slice(0, 3).map((chip) => (
              <OgChip key={chip}>{chip}</OgChip>
            ))}
          </div>
        ) : null}
        {description ? (
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: COLORS.muted,
              lineHeight: 1.4,
            }}
          >
            {ogTruncate(description)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
