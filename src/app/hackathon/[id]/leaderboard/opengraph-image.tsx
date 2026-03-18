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
  let entries: Array<{
    teamName: string;
    overallScore: number;
    rank: number;
  }> = [];
  let maxPossibleScore = 0;
  let isActive = false;

  try {
    const hackathon = await fetchQuery(api.hackathons.get, { hackathonId });
    if (hackathon) {
      hackathonName = hackathon.name;
      isActive = hackathon.isActive;
    }
    const leaderboard = await fetchQuery(api.leaderboard.get, { hackathonId });
    if (leaderboard) {
      entries = leaderboard.entries.slice(0, 8);
      maxPossibleScore = leaderboard.maxPossibleScore;
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
          padding: "40px",
        }}
      >
        {/* Border */}
        <div
          style={{
            position: "absolute",
            inset: "16px",
            border: "1px solid #1F1F1F",
            display: "flex",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "24px",
            padding: "0 8px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "4px",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {hackathonName}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#555555",
                letterSpacing: "4px",
                textTransform: "uppercase",
                marginTop: "4px",
                display: "flex",
              }}
            >
              LIVE LEADERBOARD
            </div>
          </div>
          {isActive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                color: "#00FF41",
                letterSpacing: "4px",
                textTransform: "uppercase",
                border: "1px solid rgba(0, 255, 65, 0.3)",
                padding: "6px 12px",
              }}
            >
              ● LIVE
            </div>
          )}
        </div>

        {/* Leaderboard table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "0 8px",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #1F1F1F",
              paddingBottom: "8px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "80px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#555555",
                letterSpacing: "3px",
                display: "flex",
              }}
            >
              RANK
            </div>
            <div
              style={{
                flex: 1,
                fontSize: "11px",
                fontWeight: 700,
                color: "#555555",
                letterSpacing: "3px",
                display: "flex",
              }}
            >
              TEAM
            </div>
            <div
              style={{
                width: "160px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#555555",
                letterSpacing: "3px",
                textAlign: "right",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              SCORE
            </div>
          </div>

          {/* Entries */}
          {entries.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                fontSize: "16px",
                color: "#333333",
                letterSpacing: "4px",
                textTransform: "uppercase",
              }}
            >
              NO SCORES YET
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid #1F1F1F",
                  padding: "10px 0",
                  background:
                    entry.rank === 1 ? "rgba(255, 102, 0, 0.03)" : "transparent",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    fontSize: "16px",
                    fontWeight: 700,
                    color:
                      entry.rank === 1
                        ? "#FF6600"
                        : entry.rank <= 3
                          ? "#FFFFFF"
                          : "#555555",
                    display: "flex",
                  }}
                >
                  #{entry.rank}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: "16px",
                    fontWeight: 700,
                    color:
                      entry.rank === 1
                        ? "#FF6600"
                        : entry.rank <= 3
                          ? "#FFFFFF"
                          : "#555555",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    display: "flex",
                  }}
                >
                  {entry.teamName}
                </div>
                <div
                  style={{
                    width: "160px",
                    fontSize: "16px",
                    fontWeight: 700,
                    color:
                      entry.overallScore > 0
                        ? entry.rank === 1
                          ? "#FF6600"
                          : "#00FF41"
                        : "#333333",
                    textAlign: "right",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  {entry.overallScore > 0
                    ? `${entry.overallScore.toFixed(1)}/${maxPossibleScore}`
                    : "—"}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            padding: "0 8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg
              width="20"
              height="20"
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
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "3px",
                display: "flex",
              }}
            >
              HILLPOST
            </div>
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#333333",
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
