import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const submissionId = resolvedParams.submissionId as Id<"submissions">;
  
  try {
    const submission = await fetchQuery(api.submissions.get, { submissionId });
    
    if (!submission) {
      return {
        title: "Project Submission | Hillpost",
        description: "View this project submission on Hillpost.",
      };
    }

    const title = `${submission.name} - Project Submission`;
    // Trim description if it's too long
    const shortDesc = submission.description.length > 150 
      ? submission.description.substring(0, 147) + "..." 
      : submission.description;
      
    const description = `Check out ${submission.name} on Hillpost. ${shortDesc}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Hillpost",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch (error) {
    return {
      title: "Project Submission | Hillpost",
      description: "View this project submission on Hillpost.",
    };
  }
}

export default function SubmissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
