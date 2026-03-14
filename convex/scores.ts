import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuthUserId, getAuthUserId } from "./auth";

export const submit = mutation({
  args: {
    submissionId: v.id("submissions"),
    categoryId: v.id("categories"),
    score: v.number(),
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

    const currentIteration = submission.submissionCount ?? 1;

    // Upsert: check if this judge already scored this submission+category for the current iteration
    const candidates = await ctx.db
      .query("scores")
      .withIndex("by_submissionId_categoryId_judgeId", (q) =>
        q
          .eq("submissionId", args.submissionId)
          .eq("categoryId", args.categoryId)
          .eq("judgeId", judgeId)
      )
      .collect();

    const existing = candidates.find(
      (s) => (s.submissionCount ?? 1) === currentIteration
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
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
      scoredAt: Date.now(),
      submissionCount: currentIteration,
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
    const submission = await ctx.db.get(args.submissionId);
    const currentIteration = submission?.submissionCount ?? 1;

    const allScores = await ctx.db
      .query("scores")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", args.submissionId)
      )
      .collect();

    return allScores.filter(
      (s) => (s.submissionCount ?? 1) === currentIteration
    );
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

    const submission = await ctx.db.get(args.submissionId);
    const currentIteration = submission?.submissionCount ?? 1;

    const allScores = await ctx.db
      .query("scores")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", args.submissionId)
      )
      .collect();

    return allScores.filter(
      (s) =>
        s.judgeId === userId &&
        (s.submissionCount ?? 1) === currentIteration
    );
  },
});

/**
 * Submit or update overall feedback for a submission version.
 * One feedback entry per judge per version.
 */
export const submitFeedback = mutation({
  args: {
    submissionId: v.id("submissions"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const judgeId = await requireAuthUserId(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    // Verify user is an approved judge or organizer
    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", submission.hackathonId).eq("userId", judgeId)
      )
      .first();
    if (
      !membership ||
      (membership.role !== "judge" && membership.role !== "organizer") ||
      (membership.role === "judge" && membership.status !== "approved")
    ) {
      throw new Error("Only approved judges and organizers can submit feedback");
    }

    const currentIteration = submission.submissionCount ?? 1;

    // Upsert feedback for this judge + submission + iteration
    const existing = await ctx.db
      .query("judgeFeedback")
      .withIndex("by_submissionId_judgeId_submissionCount", (q) =>
        q
          .eq("submissionId", args.submissionId)
          .eq("judgeId", judgeId)
          .eq("submissionCount", currentIteration)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        feedback: args.feedback,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("judgeFeedback", {
      submissionId: args.submissionId,
      judgeId,
      feedback: args.feedback,
      submissionCount: currentIteration,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get the current judge's feedback for a submission (current iteration).
 */
export const getMyFeedbackForSubmission = query({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const submission = await ctx.db.get(args.submissionId);
    const currentIteration = submission?.submissionCount ?? 1;

    return await ctx.db
      .query("judgeFeedback")
      .withIndex("by_submissionId_judgeId_submissionCount", (q) =>
        q
          .eq("submissionId", args.submissionId)
          .eq("judgeId", userId)
          .eq("submissionCount", currentIteration)
      )
      .first();
  },
});

/**
 * Returns scores/feedback for a submission grouped by iteration and judge.
 * - Organizers see judge names.
 * - Competitors and judges see anonymous labels ("Judge 1", "Judge 2", …)
 *   and judge IDs are NOT sent to the client.
 * - Feedback is one text per judge per version (from judgeFeedback table).
 * - Returns all iterations so competitors can see score history.
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

    // Fetch all scores for this submission (all iterations)
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", args.submissionId)
      )
      .collect();

    // Fetch all judge feedback entries for this submission
    const allFeedback = await ctx.db
      .query("judgeFeedback")
      .withIndex("by_submissionId", (q) =>
        q.eq("submissionId", args.submissionId)
      )
      .collect();

    if (scores.length === 0 && allFeedback.length === 0) {
      return {
        iterations: [],
        categories: [],
        currentSubmissionCount: submission.submissionCount,
      };
    }

    // Fetch categories for this hackathon
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_hackathonId", (q) =>
        q.eq("hackathonId", submission.hackathonId)
      )
      .collect();
    const sortedCategories = categories.sort((a, b) => a.order - b.order);

    // Group scores by iteration (submissionCount)
    const iterationMap = new Map<
      number,
      Array<{
        judgeId: string;
        categoryId: Id<"categories">;
        score: number;
        scoredAt: number;
      }>
    >();
    for (const s of scores) {
      const iter = s.submissionCount ?? 1;
      if (!iterationMap.has(iter)) {
        iterationMap.set(iter, []);
      }
      iterationMap.get(iter)!.push({
        judgeId: s.judgeId,
        categoryId: s.categoryId,
        score: s.score,
        scoredAt: s.scoredAt,
      });
    }

    // Also include iterations that only have feedback but no scores
    for (const fb of allFeedback) {
      if (!iterationMap.has(fb.submissionCount)) {
        iterationMap.set(fb.submissionCount, []);
      }
    }

    // Build feedback lookup: iteration -> judgeId -> feedback text
    const feedbackLookup = new Map<number, Map<string, string>>();
    for (const fb of allFeedback) {
      if (!feedbackLookup.has(fb.submissionCount)) {
        feedbackLookup.set(fb.submissionCount, new Map());
      }
      feedbackLookup.get(fb.submissionCount)!.set(fb.judgeId, fb.feedback);
    }

    // Collect all unique judge IDs across all iterations for stable numbering
    const allJudgeIds = new Set<string>();
    for (const iterScores of iterationMap.values()) {
      for (const s of iterScores) {
        allJudgeIds.add(s.judgeId);
      }
    }
    for (const fb of allFeedback) {
      allJudgeIds.add(fb.judgeId);
    }

    // Precompute earliest scoredAt per judge for stable ordering
    const earliestScoredAt = new Map<string, number>();
    for (const s of scores) {
      const prev = earliestScoredAt.get(s.judgeId);
      if (prev === undefined || s.scoredAt < prev) {
        earliestScoredAt.set(s.judgeId, s.scoredAt);
      }
    }
    // For judges with only feedback (no scores), use their feedback updatedAt
    for (const fb of allFeedback) {
      if (!earliestScoredAt.has(fb.judgeId)) {
        earliestScoredAt.set(fb.judgeId, fb.updatedAt);
      }
    }

    const sortedJudgeIds = [...allJudgeIds].sort((a, b) => {
      return (earliestScoredAt.get(a) ?? 0) - (earliestScoredAt.get(b) ?? 0);
    });

    // For organizers, batch-resolve judge names
    let judgeNameMap: Map<string, string> | undefined;
    if (isOrganizer) {
      const members = await ctx.db
        .query("hackathonMembers")
        .withIndex("by_hackathonId", (q) =>
          q.eq("hackathonId", submission.hackathonId)
        )
        .collect();
      judgeNameMap = new Map();
      for (const m of members) {
        judgeNameMap.set(m.userId, m.userName);
      }
    }

    // Build a label map (same label for a judge across all iterations)
    const judgeLabelMap = new Map<string, string>();
    sortedJudgeIds.forEach((jid, index) => {
      judgeLabelMap.set(
        jid,
        isOrganizer
          ? (judgeNameMap!.get(jid) ?? `Judge ${index + 1}`)
          : `Judge ${index + 1}`
      );
    });

    // Build iterations array sorted by submissionCount descending (most recent first)
    const iterationNumbers = [...iterationMap.keys()].sort((a, b) => b - a);

    const iterations = iterationNumbers.map((iterNum) => {
      const iterScores = iterationMap.get(iterNum)!;
      const iterFeedbackMap = feedbackLookup.get(iterNum);

      // Group by judgeId within this iteration
      const judgeScoresMap = new Map<
        string,
        Array<{ categoryId: Id<"categories">; score: number }>
      >();
      for (const s of iterScores) {
        if (!judgeScoresMap.has(s.judgeId)) {
          judgeScoresMap.set(s.judgeId, []);
        }
        judgeScoresMap.get(s.judgeId)!.push({
          categoryId: s.categoryId,
          score: s.score,
        });
      }

      // Collect judges present in this iteration (have scores or feedback)
      const judgeIdsInIter = sortedJudgeIds.filter(
        (jid) =>
          judgeScoresMap.has(jid) ||
          (iterFeedbackMap && iterFeedbackMap.has(jid))
      );

      const judges = judgeIdsInIter.map((jid) => {
        const judgeScores = judgeScoresMap.get(jid) ?? [];
        const categoryScores = sortedCategories.map((cat) => {
          const entry = judgeScores.find((s) => s.categoryId === cat._id);
          return {
            categoryId: cat._id,
            score: entry?.score ?? null,
          };
        });

        return {
          label: judgeLabelMap.get(jid)!,
          categoryScores,
          feedback: iterFeedbackMap?.get(jid) ?? null,
        };
      });

      return {
        submissionCount: iterNum,
        judges,
      };
    });

    return {
      iterations,
      categories: sortedCategories.map((c) => ({
        _id: c._id,
        name: c.name,
        maxScore: c.maxScore,
      })),
      currentSubmissionCount: submission.submissionCount,
    };
  },
});
