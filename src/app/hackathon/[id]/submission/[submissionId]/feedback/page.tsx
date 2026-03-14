"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, History } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const barWidth = 20;
  const filled = maxScore > 0 ? Math.round((score / maxScore) * barWidth) : 0;
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
  return (
    <span className="font-mono text-xs">
      <span className="text-[#00FF41]">{bar}</span>{" "}
      <span className="text-white">{score}</span>
      <span className="text-[#555555]">/{maxScore}</span>
    </span>
  );
}

export default function FeedbackPage() {
  const params = useParams();
  const hackathonId = params.id as Id<"hackathons">;
  const submissionId = params.submissionId as Id<"submissions">;

  const submission = useQuery(api.submissions.get, { submissionId });
  const membership = useQuery(api.members.getMyMembership, { hackathonId });
  const feedback = useQuery(api.scores.getFeedbackForSubmission, {
    submissionId,
  });

  const teamId = submission?.teamId;
  const team = useQuery(api.teams.get, teamId ? { teamId } : "skip");

  const [selectedIteration, setSelectedIteration] = useState<number | null>(
    null
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (
    submission === undefined ||
    membership === undefined ||
    feedback === undefined
  ) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-xs text-[#555555] uppercase tracking-widest">
          ▓▓▓░░░ LOADING...
        </p>
      </div>
    );
  }

  if (!submission || !feedback || !membership) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center">
          <p className="text-sm text-[#555555] uppercase tracking-wider">
            FEEDBACK NOT AVAILABLE
          </p>
          <Link
            href={`/hackathon/${hackathonId}`}
            className="mt-4 inline-flex items-center gap-1 text-xs text-[#00FF41] hover:text-white transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-3 w-3" />
            BACK TO HACKATHON
          </Link>
        </div>
      </div>
    );
  }

  const isOrganizer = membership.role === "organizer";
  const { iterations, categories, currentSubmissionCount } = feedback;

  // Default to the current (most recent) iteration
  const activeIteration =
    selectedIteration ?? currentSubmissionCount;
  const currentIterData = iterations.find(
    (it) => it.submissionCount === activeIteration
  );
  const judges = currentIterData?.judges ?? [];

  const hasMultipleIterations = iterations.length > 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back nav */}
      <Link
        href={`/hackathon/${hackathonId}`}
        className="mb-6 inline-flex items-center gap-1 text-xs text-[#555555] hover:text-white transition-colors uppercase tracking-wider"
      >
        <ArrowLeft className="h-3 w-3" />
        BACK TO HACKATHON
      </Link>

      {/* Header */}
      <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="h-4 w-4 text-[#00B4FF]" />
          <h1 className="text-xl font-bold text-white uppercase tracking-wide">
            JUDGE FEEDBACK
          </h1>
        </div>
        <p className="text-xs text-[#555555]">
          {submission.name}
          {team && <span> — {team.name}</span>}
          {submission.submissionCount > 1 && (
            <span className="ml-2 text-[#00B4FF]">
              v{submission.submissionCount}
            </span>
          )}
        </p>
        {!isOrganizer && (
          <p className="mt-2 text-xs text-[#333333]">
            Judge identities are kept anonymous.
          </p>
        )}
      </div>

      {/* Iteration selector */}
      {hasMultipleIterations && (
        <div className="mb-4 border border-[#1F1F1F] bg-[#0A0A0A] p-4">
          <div className="flex items-center gap-3 mb-3">
            <History className="h-3.5 w-3.5 text-[#FF6600]" />
            <span className="text-xs font-bold text-[#555555] uppercase tracking-widest">
              SCORE HISTORY
            </span>
          </div>
          <div className="flex gap-0 border border-[#1F1F1F] overflow-x-auto">
            {iterations.map((iter) => (
              <button
                key={iter.submissionCount}
                onClick={() => {
                  setSelectedIteration(iter.submissionCount);
                  setExpandedCategory(null);
                }}
                className={cn(
                  "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-r border-[#1F1F1F] last:border-r-0 whitespace-nowrap",
                  activeIteration === iter.submissionCount
                    ? "bg-white text-black"
                    : "bg-black text-[#555555] hover:text-white"
                )}
              >
                v{iter.submissionCount}
                {iter.submissionCount === currentSubmissionCount && (
                  <span className="ml-1 text-[10px] text-[#00FF41]" aria-label="Current version">
                    ●
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeIteration !== currentSubmissionCount && (
            <p className="mt-2 text-xs text-[#FF6600]">
              Viewing historical scores from v{activeIteration}
            </p>
          )}
        </div>
      )}

      {/* No scores for this iteration */}
      {judges.length === 0 && (
        <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8 text-center">
          <p className="text-sm text-[#555555] uppercase tracking-wider">
            NO SCORES {hasMultipleIterations ? `FOR V${activeIteration}` : "YET"}
          </p>
          <p className="mt-2 text-xs text-[#333333]">
            {hasMultipleIterations
              ? "No judges scored this iteration."
              : "This submission has not been judged yet. Check back later."}
          </p>
        </div>
      )}

      {/* Category cards */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const isExpanded = expandedCategory === cat._id;

          // Gather each judge's score + feedback for this category
          const judgeEntries = judges.map((judge) => {
            const cs = judge.categoryScores.find(
              (s) => s.categoryId === cat._id
            );
            return {
              label: judge.label,
              score: cs?.score ?? null,
              feedback: cs?.feedback ?? null,
            };
          });

          // Compute average score across judges who scored
          const scoredEntries = judgeEntries.filter((e) => e.score != null);
          const avgScore =
            scoredEntries.length > 0
              ? Math.round(
                  (scoredEntries.reduce((sum, e) => sum + e.score!, 0) /
                    scoredEntries.length) *
                    10
                ) / 10
              : null;
          const hasFeedback = judgeEntries.some((e) => e.feedback);

          return (
            <div
              key={cat._id}
              className="border border-[#1F1F1F] bg-[#0A0A0A] overflow-hidden"
            >
              {/* Category header — always visible */}
              <button
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : cat._id)
                }
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#111111] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-white uppercase tracking-widest">
                    {cat.name}
                  </span>
                  {avgScore != null && (
                    <ScoreBar score={avgScore} maxScore={cat.maxScore} />
                  )}
                  {hasFeedback && (
                    <MessageSquare className="h-3 w-3 text-[#00B4FF] shrink-0" />
                  )}
                </div>
                <span className="text-xs text-[#555555] uppercase tracking-wider shrink-0 ml-3">
                  {isExpanded ? "[ COLLAPSE ]" : "[ EXPAND ]"}
                </span>
              </button>

              {/* Expanded content — per-judge scores + feedback */}
              {isExpanded && (
                <div className="border-t border-[#1F1F1F] px-5 py-4 space-y-3">
                  {judgeEntries.map((entry) => (
                    <div
                      key={entry.label}
                      className="border border-[#1F1F1F] bg-black p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "tui-badge text-[10px]",
                            isOrganizer
                              ? "border-[#FF6600] text-[#FF6600]"
                              : "border-[#00B4FF] text-[#00B4FF]"
                          )}
                        >
                          {entry.label}
                        </span>
                        {entry.score != null ? (
                          <ScoreBar
                            score={entry.score}
                            maxScore={cat.maxScore}
                          />
                        ) : (
                          <span className="text-xs text-[#333333] uppercase">
                            NOT SCORED
                          </span>
                        )}
                      </div>
                      {entry.feedback && (
                        <div className="mt-2 border-l-2 border-[#00B4FF]/30 pl-3">
                          <p className="text-xs text-[#AAAAAA] leading-relaxed whitespace-pre-wrap">
                            {entry.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
