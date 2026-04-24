import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import type { DatabaseReader } from "./_generated/server";
import { requireAuthUserId, getAuthUserId } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Computes the overall leaderboard score for a set of scores, matching the
 * leaderboard formula: sum of per-category averages.
 */
function computeOverallScore(
  scores: Array<{ categoryId: Id<"categories">; score: number }>,
  categories: Array<{ _id: Id<"categories"> }>
): number {
  let overallScore = 0;
  for (const category of categories) {
    const catScores = scores.filter((s) => s.categoryId === category._id);
    if (catScores.length > 0) {
      overallScore += catScores.reduce((sum, s) => sum + s.score, 0) / catScores.length;
    }
  }
  return overallScore;
}

/**
 * Returns true if another team currently has a strictly higher overall score than
 * the given team's submission — i.e. the team has been "dethroned".
 * A team is only considered dethroneable if they have been judged (score > 0).
 */
async function checkDethroned(
  db: DatabaseReader,
  hackathonId: Id<"hackathons">,
  teamId: Id<"teams">,
  submissionId: Id<"submissions">,
  currentIteration: number
): Promise<boolean> {
  const categories = await db
    .query("categories")
    .withIndex("by_hackathonId", (q) => q.eq("hackathonId", hackathonId))
    .collect();
  if (categories.length === 0) return false;

  const myScores = await db
    .query("scores")
    .withIndex("by_submissionId", (q) => q.eq("submissionId", submissionId))
    .filter((q) => q.eq(q.field("submissionCount"), currentIteration))
    .collect();

  if (myScores.length === 0) return false; // Never been judged — not the king
  const myOverallScore = computeOverallScore(myScores, categories);
  if (myOverallScore === 0) return false;

  const allSubmissions = await db
    .query("submissions")
    .withIndex("by_hackathonId", (q) => q.eq("hackathonId", hackathonId))
    .collect();

  for (const other of allSubmissions) {
    if (other.teamId === teamId) continue;
    const otherScores = await db
      .query("scores")
      .withIndex("by_submissionId", (q) => q.eq("submissionId", other._id))
      .filter((q) => q.eq(q.field("submissionCount"), other.submissionCount))
      .collect();
    if (otherScores.length === 0) continue;
    const otherOverallScore = computeOverallScore(otherScores, categories);
    if (otherOverallScore > myOverallScore) return true;
  }

  return false;
}

/**
 * Returns true if the caller may access the given hackathon's data.
 * Public hackathons are always accessible. Private hackathons require an authenticated member.
 */
async function canAccessHackathon(ctx: QueryCtx, hackathonId: Id<"hackathons">): Promise<boolean> {
  const hackathon = await ctx.db.get(hackathonId);
  if (!hackathon) return false;
  if (hackathon.isPublic) return true;
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const membership = await ctx.db
    .query("hackathonMembers")
    .withIndex("by_hackathonId_userId", (q) =>
      q.eq("hackathonId", hackathonId).eq("userId", userId)
    )
    .first();
  return membership !== null;
}

async function anonymizeSubmission(ctx: QueryCtx, submission: Doc<"submissions">) {
  const userId = await getAuthUserId(ctx);
  
  if (!userId) {
    return { ...submission, submittedBy: "", judgedBy: [] };
  }

  const membership = await ctx.db
    .query("hackathonMembers")
    .withIndex("by_hackathonId_userId", (q) =>
      q.eq("hackathonId", submission.hackathonId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    return { ...submission, submittedBy: "", judgedBy: [] };
  }

  if (membership.role === "organizer") {
    return submission;
  }

  if (membership.role === "judge") {
    return { ...submission, submittedBy: "" };
  }

  if (membership.role === "competitor" && membership.teamId === submission.teamId) {
    return { ...submission, judgedBy: [] };
  }

  return { ...submission, submittedBy: "", judgedBy: [] };
}

function sanitizeUrl(url: string | undefined, fieldName: string, required: boolean): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) {
    if (required) throw new Error(`${fieldName} is required`);
    return undefined;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Invalid URL scheme for ${fieldName}: ${parsed.protocol} — only http and https are allowed`);
    }
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(`Invalid URL format for ${fieldName}`);
    }
    throw e;
  }
  return trimmed;
}

function requireNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldName} is required`);
  return trimmed;
}

export const create = mutation({
  args: {
    hackathonId: v.id("hackathons"),
    teamId: v.id("teams"),
    name: v.string(),
    description: v.string(),
    projectUrl: v.string(),
    demoUrl: v.optional(v.string()),
    deployedUrl: v.optional(v.string()),
    whatsNew: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    // Verify user is a competitor member on this team
    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", userId)
      )
      .first();
    if (!membership) {
      throw new Error("You must be a member of this hackathon");
    }
    if (membership.role !== "competitor") {
      throw new Error("Only competitors can submit projects");
    }
    if (!membership.teamId || membership.teamId !== args.teamId) {
      throw new Error("You can only submit for your own team");
    }

    const projectUrl = sanitizeUrl(args.projectUrl, "Project URL", true)!;
    const demoUrl = sanitizeUrl(args.demoUrl, "Video URL", false);
    const deployedUrl = sanitizeUrl(args.deployedUrl, "Deployment URL", false);
    const name = requireNonEmpty(args.name, "Name");
    const description = requireNonEmpty(args.description, "Description");

    // Rate limiting: check the team's latest submission
    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon) {
      throw new Error("Hackathon not found");
    }

    const submissionsOpenAt = hackathon.submissionsStartDate ?? hackathon.startDate;
    if (Date.now() < submissionsOpenAt) {
      const opensDate = new Date(submissionsOpenAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      throw new Error(`Submissions are not open yet. They open on ${opensDate}.`);
    }

    const existingSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_hackathonId_teamId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("teamId", args.teamId)
      )
      .first();

    if (existingSubmission) {
      const cooldownMs = hackathon.submissionFrequencyMinutes * 60 * 1000;
      const timeSinceLastSubmission = Date.now() - existingSubmission.submittedAt;
      if (timeSinceLastSubmission < cooldownMs) {
        const dethroned = await checkDethroned(
          ctx.db,
          args.hackathonId,
          args.teamId,
          existingSubmission._id,
          existingSubmission.submissionCount
        );
        if (!dethroned) {
          const remainingMinutes = Math.max(
            1,
            Math.ceil((cooldownMs - timeSinceLastSubmission) / 60000)
          );
          throw new Error(
            `Rate limited. Please wait ${remainingMinutes} more minute(s) before submitting again.`
          );
        }
        // Dethroned teams bypass the cooldown to reclaim the crown
      }

      // Calculate baseline score
      const scores = await ctx.db
        .query("scores")
        .withIndex("by_submissionId", (q) => q.eq("submissionId", existingSubmission._id))
        .collect();

      let baselineScore = undefined;
      const baselineJudgeCount = existingSubmission.judgedBy.length;

      if (scores.length > 0) {
        const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
        baselineScore = totalScore / scores.length;
      }

      // Update existing submission
      const now = Date.now();
      const newSubmissionCount = existingSubmission.submissionCount + 1;
      const whatsNewTrimmed = args.whatsNew?.trim() || undefined;
      const existingChangelog = existingSubmission.changelog ?? [];
      const changelog = [
        ...existingChangelog,
        {
          submissionCount: newSubmissionCount,
          whatsNew: whatsNewTrimmed,
          submittedAt: now,
        },
      ];
      await ctx.db.patch(existingSubmission._id, {
        name,
        description,
        projectUrl,
        demoUrl,
        deployedUrl,
        changelog,
        // Explicitly unset legacy whatsNew field to avoid stale data
        whatsNew: undefined,
        submittedAt: now,
        submittedBy: userId,
        submissionCount: newSubmissionCount,
        judgedBy: [],
        baselineScore,
        baselineJudgeCount,
      });

      return existingSubmission._id;
    }

    return await ctx.db.insert("submissions", {
      hackathonId: args.hackathonId,
      teamId: args.teamId,
      name,
      description,
      projectUrl,
      demoUrl,
      deployedUrl,
      submittedAt: Date.now(),
      submittedBy: userId,
      submissionCount: 1,
      judgedBy: [],
    });
  },
});

export const updateDetails = mutation({
  args: {
    submissionId: v.id("submissions"),
    name: v.string(),
    description: v.string(),
    projectUrl: v.string(),
    demoUrl: v.optional(v.string()),
    deployedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", submission.hackathonId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "competitor" || membership.teamId !== submission.teamId) {
      throw new Error("Unauthorized to edit this project");
    }

    const name = requireNonEmpty(args.name, "Name");
    const description = requireNonEmpty(args.description, "Description");

    await ctx.db.patch(args.submissionId, {
      name,
      description,
      projectUrl: sanitizeUrl(args.projectUrl, "Project URL", true)!,
      demoUrl: sanitizeUrl(args.demoUrl, "Video URL", false),
      deployedUrl: sanitizeUrl(args.deployedUrl, "Deployment URL", false),
    });
  },
});

export const list = query({
  args: {
    hackathonId: v.id("hackathons"),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    if (!(await canAccessHackathon(ctx, args.hackathonId))) return [];
    let submissions: Doc<"submissions">[] = [];
    if (args.teamId) {
      submissions = await ctx.db
        .query("submissions")
        .withIndex("by_hackathonId_teamId", (q) =>
          q.eq("hackathonId", args.hackathonId).eq("teamId", args.teamId!)
        )
        .order("desc")
        .collect();
    } else {
      submissions = await ctx.db
        .query("submissions")
        .withIndex("by_hackathonId", (q) =>
          q.eq("hackathonId", args.hackathonId)
        )
        .order("desc")
        .collect();
    }
    return await Promise.all(submissions.map(s => anonymizeSubmission(ctx, s)));
  },
});

export const listForTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return [];
    if (!(await canAccessHackathon(ctx, team.hackathonId))) return [];
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
    return await Promise.all(submissions.map(s => anonymizeSubmission(ctx, s)));
  },
});

export const get = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;
    if (!(await canAccessHackathon(ctx, submission.hackathonId))) return null;
    return await anonymizeSubmission(ctx, submission);
  },
});

export const getLatestForTeam = query({
  args: {
    hackathonId: v.id("hackathons"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    if (!(await canAccessHackathon(ctx, args.hackathonId))) return null;
    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_hackathonId_teamId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("teamId", args.teamId)
      )
      .order("desc")
      .first();
    if (!submission) return null;
    return await anonymizeSubmission(ctx, submission);
  },
});

export const updateSubmissionOrganizer = mutation({
  args: {
    submissionId: v.id("submissions"),
    name: v.string(),
    description: v.string(),
    projectUrl: v.string(),
    demoUrl: v.optional(v.string()),
    deployedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", submission.hackathonId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "organizer") {
      throw new Error("Only organizers can edit any submission");
    }

    const name = requireNonEmpty(args.name, "Name");
    const description = requireNonEmpty(args.description, "Description");

    await ctx.db.patch(args.submissionId, {
      name,
      description,
      projectUrl: sanitizeUrl(args.projectUrl, "Project URL", true)!,
      demoUrl: sanitizeUrl(args.demoUrl, "Video URL", false),
      deployedUrl: sanitizeUrl(args.deployedUrl, "Deployment URL", false),
    });
  },
});

/**
 * Returns whether the caller's team has been dethroned (another team now has a
 * strictly higher leaderboard score). Only returns true when the team has been
 * judged at least once (i.e. they were a legitimate king-of-the-hill candidate).
 */
export const getDethronedStatus = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isDethroned: false };

    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "competitor" || !membership.teamId) {
      return { isDethroned: false };
    }

    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_hackathonId_teamId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("teamId", membership.teamId!)
      )
      .first();
    if (!submission) return { isDethroned: false };

    const isDethroned = await checkDethroned(
      ctx.db,
      args.hackathonId,
      membership.teamId,
      submission._id,
      submission.submissionCount
    );
    return { isDethroned };
  },
});
