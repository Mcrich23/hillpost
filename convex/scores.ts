import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const submit = mutation({
  args: {
    submissionId: v.id("submissions"),
    categoryId: v.id("categories"),
    score: v.number(),
    feedback: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new Error("Not authenticated");
    }
    const judgeId = args.userId;

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Verify user is a judge in this hackathon
    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q
          .eq("hackathonId", submission.hackathonId)
          .eq("userId", judgeId)
      )
      .first();
    if (!membership || membership.role !== "judge") {
      throw new Error("Only judges can score submissions");
    }

    // Validate score against category max
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    if (args.score < 0 || args.score > category.maxScore) {
      throw new Error(
        `Score must be between 0 and ${category.maxScore}`
      );
    }

    // Upsert: check if this judge already scored this submission+category
    const existing = await ctx.db
      .query("scores")
      .withIndex("by_submissionId_categoryId_judgeId", (q) =>
        q
          .eq("submissionId", args.submissionId)
          .eq("categoryId", args.categoryId)
          .eq("judgeId", judgeId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        feedback: args.feedback,
        scoredAt: Date.now(),
      });

      // Ensure judge is in judgedBy array
      const judgedBy = submission.judgedBy || [];
      if (!judgedBy.includes(judgeId)) {
        await ctx.db.patch(submission._id, {
          judgedBy: [...judgedBy, judgeId],
        });
      }

      return existing._id;
    }

    const scoreId = await ctx.db.insert("scores", {
      submissionId: args.submissionId,
      categoryId: args.categoryId,
      judgeId,
      score: args.score,
      feedback: args.feedback,
      scoredAt: Date.now(),
    });

    const judgedBy = submission.judgedBy || [];
    if (!judgedBy.includes(judgeId)) {
      await ctx.db.patch(submission._id, {
        judgedBy: [...judgedBy, judgeId],
      });
    }

    return scoreId;
  },
});

export const getForSubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scores")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", args.submissionId)
      )
      .collect();
  },
});

export const getMyScoresForSubmission = query({
  args: {
    submissionId: v.id("submissions"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return [];
    }

    const allScores = await ctx.db
      .query("scores")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", args.submissionId)
      )
      .collect();

    return allScores.filter((s) => s.judgeId === args.userId);
  },
});
