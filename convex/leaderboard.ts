import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "./auth";

export const get = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon) {
      return { entries: [], maxPossibleScore: 0, leaderboardHidden: false as const };
    }

    const scoresVisible = hackathon.scoresVisible !== false;
    if (!scoresVisible) {
      const userId = await getAuthUserId(ctx);
      if (userId) {
        const membership = await ctx.db
          .query("hackathonMembers")
          .withIndex("by_hackathonId_userId", (q) =>
            q.eq("hackathonId", args.hackathonId).eq("userId", userId)
          )
          .first();
        if (membership?.role === "competitor") {
          return { entries: [], maxPossibleScore: 0, leaderboardHidden: true as const };
        }
      }
    }

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_hackathonId", (q) => q.eq("hackathonId", args.hackathonId))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_hackathonId", (q) => q.eq("hackathonId", args.hackathonId))
      .collect();

    const sortedCategories = categories.sort((a, b) => a.order - b.order);

    const leaderboard = await Promise.all(
      teams.map(async (team) => {
        // Get latest submission for this team
        const latestSubmission = await ctx.db
          .query("submissions")
          .withIndex("by_hackathonId_teamId", (q) =>
            q.eq("hackathonId", args.hackathonId).eq("teamId", team._id)
          )
          .order("desc")
          .first();

        if (!latestSubmission) {
          return {
            teamId: team._id,
            teamName: team.name,
            latestSubmission: null,
            averageScore: 0,
            overallScore: 0,
            categoryScores: sortedCategories.map((c) => ({
              categoryId: c._id,
              categoryName: c.name,
              maxScore: c.maxScore,
              averageScore: 0,
              judgeCount: 0,
            })),
            totalJudgeCount: 0,
            rank: 0,
          };
        }

        // Get scores for this submission for the current iteration only
        const currentIteration = latestSubmission.submissionCount;
        const scores = await ctx.db
          .query("scores")
          .withIndex("by_submissionId", (q) =>
            q.eq("submissionId", latestSubmission._id)
          )
          .filter((q) => q.eq(q.field("submissionCount"), currentIteration))
          .collect();

        // Compute per-category averages
        const categoryScores = sortedCategories.map((category) => {
          const categoryScoreEntries = scores.filter(
            (s) => s.categoryId === category._id
          );
          const judgeCount = categoryScoreEntries.length;
          const averageScore =
            judgeCount > 0
              ? categoryScoreEntries.reduce((sum, s) => sum + s.score, 0) /
                judgeCount
              : 0;

          return {
            categoryId: category._id,
            categoryName: category.name,
            maxScore: category.maxScore,
            averageScore,
            judgeCount,
          };
        });

        // Overall average score across all categories and judges
        const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
        const rawAverageScore = scores.length > 0 ? totalScore / scores.length : 0;
        let averageScore = rawAverageScore;

        // Overall score: sum of per-category averages (full tally)
        let overallScore = categoryScores.reduce(
          (sum, cs) => sum + cs.averageScore,
          0
        );

        // Apply threshold logic for resubmissions
        if (
          latestSubmission.baselineScore !== undefined &&
          latestSubmission.baselineJudgeCount !== undefined
        ) {
          const currentJudges = latestSubmission.judgedBy.length;
          const threshold = latestSubmission.baselineJudgeCount * 0.75;
          if (currentJudges < threshold) {
            averageScore = Math.max(averageScore, latestSubmission.baselineScore);
            overallScore = Math.max(overallScore, latestSubmission.baselineScore);
          }
        }

        // Count unique judges
        const uniqueJudges = new Set(scores.map((s) => s.judgeId));

        return {
          teamId: team._id,
          teamName: team.name,
          latestSubmission: {
            ...latestSubmission,
            judgedBy: [],
            submittedBy: "",
          },
          averageScore,
          overallScore,
          categoryScores,
          totalJudgeCount: uniqueJudges.size,
          rank: 0,
        };
      })
    );

    // Sort by overall score descending and assign ranks
    leaderboard.sort((a, b) => b.overallScore - a.overallScore);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Max possible score (sum of all category maxScores)
    const maxPossibleScore = sortedCategories.reduce(
      (sum, c) => sum + c.maxScore,
      0
    );

    return { entries: leaderboard, maxPossibleScore, leaderboardHidden: false as const };
  },
});
