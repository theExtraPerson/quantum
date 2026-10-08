import { ImageResponse } from "next/og";

export const alt = "QuantumMine AI — Trade Smarter, Earn Bigger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          backgroundColor: "#1558C0",
          color: "#ffffff",
        }}
      >
        <div style={{ width: 72, height: 8, backgroundColor: "#F5C400", marginBottom: 28 }} />
        <div style={{ fontSize: 64, fontWeight: 700 }}>QuantumMine AI</div>
        <div style={{ fontSize: 24, letterSpacing: 4, marginTop: 16, color: "#F5C400" }}>
          TRADE SMARTER · EARN BIGGER
        </div>
      </div>
    ),
    { ...size },
  );
}
