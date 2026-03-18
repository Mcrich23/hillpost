import { ImageResponse } from "next/og";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const alt = "Hackathon Leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const hackathonId = resolvedParams.id as Id<"hackathons">;

  let hackathonName = "Hackathon";
  let isActive = false;

  try {
    const hackathon = await fetchQuery(api.hackathons.get, { hackathonId });
    if (hackathon) {
      hackathonName = hackathon.name;
      isActive = hackathon.isActive;
    }
  } catch (e) {
    console.error("OG image fetch error:", e);
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "monospace",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Border */}
        <div
          style={{
            position: "absolute",
            inset: "24px",
            border: "2px solid #1F1F1F",
            display: "flex",
          }}
        />

        <div
          style={{
            fontSize: "24px",
            color: "#00FF41",
            letterSpacing: "8px",
            textTransform: "uppercase",
            marginBottom: "32px",
            display: "flex",
          }}
        >
          {isActive ? "[ LIVE LEADERBOARD ]" : "[ LEADERBOARD ]"}
        </div>

        <div
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "4px",
            textTransform: "uppercase",
            textAlign: "center",
            display: "flex",
            maxWidth: "1000px",
            lineHeight: 1.2,
          }}
        >
          {hackathonName}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            left: "48px",
            right: "48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "4px",
              display: "flex",
            }}
          >
            HILLPOST
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#555555",
              letterSpacing: "3px",
              display: "flex",
            }}
          >
            hillpost.dev
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
