"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Star,
  MessageSquare,
} from "lucide-react";

interface JudgePanelProps {
  hackathonId: Id<"hackathons">;
}

export function JudgePanel({ hackathonId }: JudgePanelProps) {
  const submissions = useQuery(api.submissions.list, { hackathonId });
  const categories = useQuery(api.categories.list, { hackathonId });
  const teams = useQuery(api.teams.list, { hackathonId });
  const [expandedId, setExpandedId] = useState<Id<"submissions"> | null>(null);

  const teamMap = new Map(teams?.map((t) => [t._id, t.name]) ?? []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-4 text-lg font-semibold text-white">
          <Star className="mr-2 inline h-5 w-5 text-emerald-400" />
          Submissions to Judge
        </h3>

        {!submissions || !categories ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No submissions to judge yet.
          </p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub._id}
                className="rounded-lg border border-gray-700 bg-gray-800"
              >
                <button
                  onClick={() =>
                    setExpandedId(expandedId === sub._id ? null : sub._id)
                  }
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{sub.name}</p>
                      <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                        {teamMap.get(sub.teamId) ?? "Unknown Team"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {sub.description}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        {format(
                          new Date(sub.submittedAt),
                          "MMM d, yyyy h:mm a"
                        )}
                      </span>
                      <a
                        href={sub.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Project
                      </a>
                      {sub.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Demo
                        </a>
                      )}
                    </div>
                  </div>
                  {expandedId === sub._id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {expandedId === sub._id && (
                  <div className="border-t border-gray-700 p-4">
                    <ScoringForm
                      submissionId={sub._id}
                      categories={categories}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ScoringFormProps {
  submissionId: Id<"submissions">;
  categories: Array<{
    _id: Id<"categories">;
    name: string;
    description: string;
    maxScore: number;
  }>;
}

function ScoringForm({ submissionId, categories }: ScoringFormProps) {
  const { user } = useUser();
  const myScores = useQuery(api.scores.getMyScoresForSubmission, {
    submissionId,
    userId: user?.id,
  });
  const submitScore = useMutation(api.scores.submit);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Initialize from existing scores
  const getExistingScore = (categoryId: Id<"categories">) => {
    return myScores?.find((s) => s.categoryId === categoryId);
  };

  const getCurrentScore = (categoryId: Id<"categories">, maxScore: number) => {
    if (scores[categoryId] !== undefined) return scores[categoryId];
    const existing = getExistingScore(categoryId);
    return existing?.score ?? Math.floor(maxScore / 2);
  };

  const getCurrentFeedback = (categoryId: Id<"categories">) => {
    if (feedbacks[categoryId] !== undefined) return feedbacks[categoryId];
    const existing = getExistingScore(categoryId);
    return existing?.feedback ?? "";
  };

  const handleSubmitScore = async (categoryId: Id<"categories">, maxScore: number) => {
    setSubmitting(categoryId);
    try {
      const score = getCurrentScore(categoryId, maxScore);
      const feedback = getCurrentFeedback(categoryId);
      await submitScore({
        submissionId,
        categoryId,
        score,
        feedback: feedback || undefined,
        userId: user?.id ?? "",
      });
      toast.success("Score submitted!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit score"
      );
    } finally {
      setSubmitting(null);
    }
  };

  if (!myScores) {
    return <p className="text-sm text-gray-500">Loading scores...</p>;
  }

  return (
    <div className="space-y-4">
      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">
          No scoring categories defined yet.
        </p>
      ) : (
        categories.map((cat) => {
          const existing = getExistingScore(cat._id);
          const currentScore = getCurrentScore(cat._id, cat.maxScore);
          const currentFeedback = getCurrentFeedback(cat._id);

          return (
            <div
              key={cat._id}
              className="rounded-lg border border-gray-600 bg-gray-900 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{cat.name}</p>
                  <p className="text-xs text-gray-500">{cat.description}</p>
                </div>
                {existing && (
                  <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-400">
                    Scored
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={cat.maxScore}
                    value={currentScore}
                    onChange={(e) =>
                      setScores({
                        ...scores,
                        [cat._id]: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-emerald-500"
                  />
                  <div className="flex w-20 items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={cat.maxScore}
                      value={currentScore}
                      onChange={(e) =>
                        setScores({
                          ...scores,
                          [cat._id]: Math.min(
                            Number(e.target.value),
                            cat.maxScore
                          ),
                        })
                      }
                      className="w-14 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-center text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-gray-500">
                      /{cat.maxScore}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MessageSquare className="mt-2 h-4 w-4 flex-shrink-0 text-gray-500" />
                  <textarea
                    value={currentFeedback}
                    onChange={(e) =>
                      setFeedbacks({
                        ...feedbacks,
                        [cat._id]: e.target.value,
                      })
                    }
                    placeholder="Feedback (optional)"
                    rows={2}
                    className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => handleSubmitScore(cat._id, cat.maxScore)}
                  disabled={submitting === cat._id}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm text-white",
                    existing
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "bg-emerald-600 hover:bg-emerald-500",
                    "disabled:opacity-50"
                  )}
                >
                  {submitting === cat._id
                    ? "Saving..."
                    : existing
                      ? "Update Score"
                      : "Submit Score"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
