import { ImageResponse } from "next/og";

export const alt = "QuantumMine AI invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = (code || "").trim().toUpperCase().slice(0, 10);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EEF1F6",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 1040,
            height: 480,
            backgroundColor: "#ffffff",
            borderRadius: 28,
            overflow: "hidden",
          }}
        >
          <div style={{ height: 12, backgroundColor: "#F5C400" }} />
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 72px",
              backgroundColor: "#1558C0",
              color: "#ffffff",
            }}
          >
            <div style={{ fontSize: 28, letterSpacing: 4, color: "#F5C400" }}>QUANTUMMINE AI</div>
            <div style={{ fontSize: 42, marginTop: 18 }}>Join with referral code</div>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: 10, marginTop: 8 }}>{invite}</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
