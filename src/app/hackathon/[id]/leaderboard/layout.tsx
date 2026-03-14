import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const hackathonId = resolvedParams.id as Id<"hackathons">;
  
  try {
    const hackathon = await fetchQuery(api.hackathons.get, { hackathonId });
    
    if (!hackathon) {
      return {
        title: "Leaderboard | Hillpost",
        description: "View the live leaderboard for this hackathon.",
      };
    }

    const title = `${hackathon.name} - Live Leaderboard`;
    const description = `Check out the live rankings and scores for ${hackathon.name} on Hillpost.`;

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
      title: "Leaderboard | Hillpost",
      description: "View the live leaderboard for this hackathon.",
    };
  }
}

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
