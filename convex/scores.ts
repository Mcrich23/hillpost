import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, getAuthUserId } from "./auth";

export const submit = mutation({
  args: {
    submissionId: v.id("submissions"),
    categoryId: v.id("categories"),
    score: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const judgeId = await requireAuthUserId(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Verify user is an approved judge or organizer in this hackathon
    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q
          .eq("hackathonId", submission.hackathonId)
          .eq("userId", judgeId)
      )
      .first();
    if (
      !membership ||
      (membership.role !== "judge" && membership.role !== "organizer") ||
      (membership.role === "judge" && membership.status !== "approved")
    ) {
      throw new Error("Only approved judges and organizers can score submissions");
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
      if (!submission.judgedBy.includes(judgeId)) {
        await ctx.db.patch(submission._id, {
          judgedBy: [...submission.judgedBy, judgeId],
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

    if (!submission.judgedBy.includes(judgeId)) {
      await ctx.db.patch(submission._id, {
        judgedBy: [...submission.judgedBy, judgeId],
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const allScores = await ctx.db
      .query("scores")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", args.submissionId)
      )
      .collect();

    return allScores.filter((s) => s.judgeId === userId);
  },
});

/**
 * Returns scores/feedback for a submission grouped by judge.
 * - Organizers see judge names.
 * - Competitors and judges see anonymous labels ("Judge 1", "Judge 2", …)
 *   and judge IDs are NOT sent to the client.
 */
export const getFeedbackForSubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;

    // Determine caller's role
    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", submission.hackathonId).eq("userId", userId)
      )
      .first();
    if (!membership) return null;

    const isOrganizer = membership.role === "organizer";

    // Fetch all scores for this submission
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", args.submissionId)
      )
      .collect();

    if (scores.length === 0) return { judges: [], categories: [] };

    // Fetch categories for this hackathon
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_hackathonId", (q) =>
        q.eq("hackathonId", submission.hackathonId)
      )
      .collect();
    const sortedCategories = categories.sort((a, b) => a.order - b.order);

    // Group scores by judgeId
    const judgeScoresMap = new Map<
      string,
      Array<{ categoryId: string; score: number; feedback?: string; scoredAt: number }>
    >();
    for (const s of scores) {
      if (!judgeScoresMap.has(s.judgeId)) {
        judgeScoresMap.set(s.judgeId, []);
      }
      judgeScoresMap.get(s.judgeId)!.push({
        categoryId: s.categoryId as string,
        score: s.score,
        feedback: s.feedback,
        scoredAt: s.scoredAt,
      });
    }

    // Build judge entries — stable ordering by earliest scoredAt
    const judgeIds = [...judgeScoresMap.keys()].sort((a, b) => {
      const aMin = Math.min(...judgeScoresMap.get(a)!.map((s) => s.scoredAt));
      const bMin = Math.min(...judgeScoresMap.get(b)!.map((s) => s.scoredAt));
      return aMin - bMin;
    });

    // For organizers, resolve judge names
    let judgeNameMap: Map<string, string> | undefined;
    if (isOrganizer) {
      judgeNameMap = new Map();
      for (const jid of judgeIds) {
        const member = await ctx.db
          .query("hackathonMembers")
          .withIndex("by_hackathonId_userId", (q) =>
            q.eq("hackathonId", submission.hackathonId).eq("userId", jid)
          )
          .first();
        judgeNameMap.set(jid, member?.userName ?? "Unknown Judge");
      }
    }

    const judges = judgeIds.map((jid, index) => {
      const judgeScores = judgeScoresMap.get(jid)!;
      const categoryScores = sortedCategories.map((cat) => {
        const entry = judgeScores.find((s) => s.categoryId === (cat._id as string));
        return {
          categoryId: cat._id as string,
          score: entry?.score ?? null,
          feedback: entry?.feedback ?? null,
        };
      });

      return {
        // Only include judge name for organizers; never send judgeId to non-organizers
        label: isOrganizer
          ? (judgeNameMap!.get(jid) ?? `Judge ${index + 1}`)
          : `Judge ${index + 1}`,
        categoryScores,
      };
    });

    return {
      judges,
      categories: sortedCategories.map((c) => ({
        _id: c._id as string,
        name: c.name,
        maxScore: c.maxScore,
      })),
    };
  },
});
