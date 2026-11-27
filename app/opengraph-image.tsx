import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

// The default preview card when a link to the site is shared (entries with an image use their own).
export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#fcfcfc", color: "#1e1e1e", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#6b6b6b" }}>[ Directory &amp; research tool ]</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
            A map of&nbsp;<span style={{ color: "#f04a30" }}>creative technology</span>
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#4a4a4a", maxWidth: 900 }}>{SITE_DESCRIPTION}</div>
        </div>
        <div style={{ display: "flex", height: 10, width: 220, background: "#f04a30" }} />
      </div>
    ),
    size,
  );
}
