"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Trophy, ExternalLink } from "lucide-react";

export default function LeaderboardPage() {
  const params = useParams();
  const hackathonId = params.id as Id<"hackathons">;

  const hackathon = useQuery(api.hackathons.get, { hackathonId });
  const leaderboard = useQuery(api.leaderboard.get, { hackathonId });

  if (hackathon === undefined || leaderboard === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-lg text-gray-400">Hackathon not found</p>
        </div>
      </div>
    );
  }

  const getRankDecoration = (rank: number) => {
    switch (rank) {
      case 1:
        return "👑";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return null;
    }
  };

  const getRankRowClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-500/30 bg-yellow-600/5";
      case 2:
        return "border-gray-400/30 bg-gray-400/5";
      case 3:
        return "border-amber-600/30 bg-amber-600/5";
      default:
        return "border-gray-700";
    }
  };

  // Collect all category names for the header
  const categoryNames =
    leaderboard.length > 0
      ? leaderboard[0].categoryScores.map((cs) => cs.categoryName)
      : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/hackathon/${hackathonId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hackathon
        </Link>

        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
            <p className="text-gray-400">{hackathon.name}</p>
          </div>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-16">
          <Trophy className="mb-4 h-16 w-16 text-gray-700" />
          <h3 className="text-lg font-medium text-gray-400">
            No teams yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Scores will appear here once judges start scoring
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 text-center font-medium">
                  Avg Score
                </th>
                {categoryNames.map((name) => (
                  <th
                    key={name}
                    className="px-4 py-3 text-center font-medium"
                  >
                    {name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr
                  key={entry.teamId}
                  className={cn(
                    "border-b transition-colors duration-300",
                    getRankRowClass(entry.rank)
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getRankDecoration(entry.rank) ? (
                        <span className="text-xl">
                          {getRankDecoration(entry.rank)}
                        </span>
                      ) : (
                        <span className="text-lg font-bold text-gray-500">
                          #{entry.rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-semibold",
                        entry.rank === 1
                          ? "text-yellow-400"
                          : entry.rank <= 3
                            ? "text-white"
                            : "text-gray-300"
                      )}
                    >
                      {entry.teamName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-sm font-bold transition-all duration-300",
                        entry.averageScore > 0
                          ? "bg-emerald-600/20 text-emerald-400"
                          : "text-gray-500"
                      )}
                    >
                      {entry.averageScore > 0
                        ? entry.averageScore.toFixed(1)
                        : "—"}
                    </span>
                  </td>
                  {entry.categoryScores.map((cs) => (
                    <td
                      key={cs.categoryId}
                      className="px-4 py-3 text-center"
                    >
                      <span
                        className={cn(
                          "text-sm transition-all duration-300",
                          cs.averageScore > 0 ? "text-gray-300" : "text-gray-600"
                        )}
                      >
                        {cs.averageScore > 0
                          ? `${cs.averageScore.toFixed(1)}/${cs.maxScore}`
                          : "—"}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    {entry.latestSubmission ? (
                      <Link
                        href={`/hackathon/${hackathonId}/submission/${entry.latestSubmission._id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-600/20"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
