"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function LeaderboardPage() {
  const params = useParams();
  const hackathonId = params.id as Id<"hackathons">;

  const hackathon = useQuery(api.hackathons.get, { hackathonId });
  const leaderboardData = useQuery(api.leaderboard.get, { hackathonId });

  if (hackathon === undefined || leaderboardData === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-96 border border-[#1F1F1F] bg-[#0A0A0A] flex items-center justify-center">
          <span className="text-xs text-[#555555] uppercase tracking-widest cursor-blink">
            ▓▓▓░░░ LOADING...
          </span>
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center">
          <p className="text-sm text-[#555555] uppercase tracking-wide">Hackathon not found</p>
        </div>
      </div>
    );
  }

  const getRankLabel = (rank: number) => {
    if (rank === 1) return "#1";
    if (rank === 2) return "#2";
    if (rank === 3) return "#3";
    return `#${rank}`;
  };

  const getRankRowClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-b border-[#FF6600]/20 bg-[#FF660008]";
      case 2:
        return "border-b border-[#1F1F1F]";
      case 3:
        return "border-b border-[#1F1F1F]";
      default:
        return "border-b border-[#1F1F1F]";
    }
  };

  const { entries: leaderboard, maxPossibleScore } = leaderboardData;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/hackathon/${hackathonId}`}
          className="mb-4 inline-flex items-center gap-1 text-xs text-[#555555] uppercase tracking-wider hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Hackathon
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wide">
              LIVE LEADERBOARD
            </h1>
            <p className="text-xs text-[#555555] uppercase tracking-wider mt-1">{hackathon.name}</p>
          </div>
          {hackathon.isActive && (
            <span className="flex items-center gap-2 text-xs text-[#00FF41] uppercase tracking-widest border border-[#00FF41]/30 px-3 py-1.5">
              <span className="status-pulse h-1.5 w-1.5 bg-[#00FF41] inline-block" />
              [LiVE]
            </span>
          )}
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-[#1F1F1F] bg-[#0A0A0A] py-16">
          <div className="mb-4 text-4xl font-bold text-[#1F1F1F]">[ ]</div>
          <h3 className="text-sm font-bold text-[#555555] uppercase tracking-wider">
            NO SCORES YET
          </h3>
          <p className="mt-1 text-xs text-[#333333] uppercase tracking-wide">
            Scores will appear here once judges start scoring
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#1F1F1F] bg-[#0A0A0A]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1F1F1F] text-left bg-[#111111]">
                <th className="px-4 py-3 text-xs font-bold text-[#555555] uppercase tracking-widest">RANK</th>
                <th className="px-4 py-3 text-xs font-bold text-[#555555] uppercase tracking-widest">TEAM</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-[#555555] uppercase tracking-widest">
                  SCORE
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-[#555555] uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr
                  key={entry.teamId}
                  className={cn(getRankRowClass(entry.rank))}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-sm font-bold",
                        entry.rank === 1
                          ? "text-[#FF6600]"
                          : entry.rank <= 3
                            ? "text-white"
                            : "text-[#555555]"
                      )}
                    >
                      {getRankLabel(entry.rank)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-sm font-bold uppercase tracking-wide",
                        entry.rank === 1
                          ? "text-[#FF6600]"
                          : entry.rank <= 3
                            ? "text-white"
                            : "text-[#555555]"
                      )}
                    >
                      {entry.teamName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        entry.overallScore > 0
                          ? entry.rank === 1 ? "text-[#FF6600]" : "text-[#00FF41]"
                          : "text-[#333333]"
                      )}
                    >
                      {entry.overallScore > 0
                        ? `${entry.overallScore.toFixed(1)}/${maxPossibleScore}`
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.latestSubmission ? (
                      <Link
                        href={`/hackathon/${hackathonId}/submission/${entry.latestSubmission._id}`}
                        className="inline-flex items-center gap-1 border border-[#1F1F1F] px-3 py-1 text-xs text-[#555555] uppercase tracking-wider transition-colors hover:border-white hover:text-white"
                      >
                        VIEW →
                      </Link>
                    ) : (
                      <span className="text-xs text-[#333333]">—</span>
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
