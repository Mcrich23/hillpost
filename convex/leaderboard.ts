import { v } from "convex/values";
import { query } from "./_generated/server";

export const get = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
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
        let averageScore = scores.length > 0 ? totalScore / scores.length : 0;

        // Apply threshold logic for resubmissions
        if (
          latestSubmission.baselineScore !== undefined &&
          latestSubmission.baselineJudgeCount !== undefined
        ) {
          const currentJudges = latestSubmission.judgedBy.length;
          const threshold = latestSubmission.baselineJudgeCount * 0.75;
          if (currentJudges < threshold) {
            averageScore = Math.max(averageScore, latestSubmission.baselineScore);
          }
        }

        // Count unique judges
        const uniqueJudges = new Set(scores.map((s) => s.judgeId));

        return {
          teamId: team._id,
          teamName: team.name,
          latestSubmission,
          averageScore,
          categoryScores,
          totalJudgeCount: uniqueJudges.size,
          rank: 0,
        };
      })
    );

    // Sort by average score descending and assign ranks
    leaderboard.sort((a, b) => b.averageScore - a.averageScore);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  },
});
