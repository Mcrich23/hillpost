import { ImageResponse } from "next/og";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const alt = "Project Submission";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const resolvedParams = await params;
  const submissionId = resolvedParams.submissionId as Id<"submissions">;
  const hackathonId = resolvedParams.id as Id<"hackathons">;

  let submissionName = "Project Submission";
  let description = "";
  let hackathonName = "Hackathon";
  let teamName = "";

  try {
    const submission = await fetchQuery(api.submissions.get, { submissionId });
    if (submission && submission.hackathonId === hackathonId) {
      submissionName = submission.name;
      description =
        submission.description.length > 200
          ? submission.description.substring(0, 197) + "..."
          : submission.description;
    }

    const hackathon = await fetchQuery(api.hackathons.get, { hackathonId });
    if (hackathon) {
      hackathonName = hackathon.name;
    }

    if (submission) {
      const team = await fetchQuery(api.teams.get, { teamId: submission.teamId });
      if (team) {
        teamName = team.name;
      }
    }
  } catch {
    // fallback to defaults
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
          padding: "48px",
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

        {/* Badge */}
        <div
          style={{
            display: "flex",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#00B4FF",
              letterSpacing: "4px",
              textTransform: "uppercase",
              border: "1px solid rgba(0, 180, 255, 0.3)",
              padding: "6px 12px",
              display: "flex",
            }}
          >
            PROJECT SUBMISSION
          </div>
        </div>

        {/* Project name */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "2px",
            display: "flex",
            lineClamp: 2,
          }}
        >
          {submissionName}
        </div>

        {/* Team and hackathon */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "16px",
          }}
        >
          {teamName && (
            <div
              style={{
                fontSize: "14px",
                color: "#FF6600",
                letterSpacing: "3px",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {teamName}
            </div>
          )}
          <div
            style={{
              fontSize: "14px",
              color: "#555555",
              letterSpacing: "3px",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {hackathonName}
          </div>
        </div>

        {/* Description */}
        {description && (
          <div
            style={{
              fontSize: "16px",
              color: "#555555",
              lineHeight: 1.6,
              marginTop: "24px",
              display: "flex",
              maxWidth: "900px",
            }}
          >
            {description}
          </div>
        )}

        {/* Accent line */}
        <div
          style={{
            width: "80px",
            height: "2px",
            background: "#FF6600",
            marginTop: "auto",
            marginBottom: "24px",
            display: "flex",
          }}
        />

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
