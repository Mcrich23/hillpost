import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hillpost - King-of-the-hill style hackathon judging platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "16px",
            border: "1px solid #1F1F1F",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00FF41"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m4 17 6-6-6-6" />
            <path d="M12 19h8" />
          </svg>
        </div>
        <div
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "8px",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          HILLPOST
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "#555555",
            letterSpacing: "6px",
            textTransform: "uppercase",
            marginTop: "16px",
            display: "flex",
          }}
        >
          KING-OF-THE-HILL HACKATHON JUDGING
        </div>
        <div
          style={{
            width: "120px",
            height: "2px",
            background: "#FF6600",
            marginTop: "32px",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "14px",
            color: "#333333",
            letterSpacing: "4px",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          hillpost.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
