import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site";

// See app/opengraph-image.tsx: edge disabled static generation for a card that
// is identical on every request.
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at top left, rgba(184,137,45,0.34), transparent 30%), linear-gradient(135deg, #0b1220 0%, #131c2c 46%, #1b2433 100%)",
          color: "#f5f1eb",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "36px",
            padding: "48px",
            background: "rgba(8, 12, 18, 0.42)",
          }}
        >
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 8, textTransform: "uppercase", opacity: 0.72 }}>
            Daily news desk
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1 }}>
              {SITE_NAME}
            </div>
            <div style={{ display: "flex", maxWidth: 760, fontSize: 34, lineHeight: 1.35, opacity: 0.9 }}>
              Local-first daily news archive for multi-topic AI-generated briefings.
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, opacity: 0.72 }}>
            SEO-ready metadata, RSS, sitemap, and structured article pages
          </div>
        </div>
      </div>
    ),
    size,
  );
}
