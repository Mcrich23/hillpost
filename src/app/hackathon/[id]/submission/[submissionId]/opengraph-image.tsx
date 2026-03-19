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
  let hackathonName = "Hackathon";
  let bgImage = "";

  try {
    const submission = await fetchQuery(api.submissions.get, { submissionId });
    if (submission && submission.hackathonId === hackathonId) {
      submissionName = submission.name;
    }

    const hackathon = await fetchQuery(api.hackathons.get, { hackathonId });
    if (hackathon) {
      hackathonName = hackathon.name;
      bgImage = (hackathon as any).openGraphImageUrl || "";
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
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {bgImage && (
          <img
            src={bgImage}
            alt="background"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
            }}
          />
        )}

        {/* Border */}
        <div
          style={{
            position: "absolute",
            inset: "24px",
            border: "2px solid rgba(255,255,255,0.1)",
            display: "flex",
          }}
        />

        <div
          style={{
            fontSize: "24px",
            color: "#00B4FF",
            letterSpacing: "8px",
            textTransform: "uppercase",
            marginBottom: "32px",
            display: "flex",
          }}
        >
          [ PROJECT SUBMISSION ]
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
            marginBottom: "24px",
          }}
        >
          {submissionName}
        </div>

        <div
          style={{
            fontSize: "32px",
            color: "#AAAAAA",
            letterSpacing: "4px",
            textTransform: "uppercase",
            textAlign: "center",
            display: "flex",
            maxWidth: "1000px",
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
              color: "#AAAAAA",
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
