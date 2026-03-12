import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId } from "./auth";

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
        const remainingMinutes = Math.max(
          1,
          Math.ceil((cooldownMs - timeSinceLastSubmission) / 60000)
        );
        throw new Error(
          `Rate limited. Please wait ${remainingMinutes} more minute(s) before submitting again.`
        );
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
      const whatsNew = args.whatsNew?.trim() || undefined;
      await ctx.db.patch(existingSubmission._id, {
        name,
        description,
        projectUrl,
        demoUrl,
        deployedUrl,
        whatsNew,
        submittedAt: Date.now(),
        submittedBy: userId,
        submissionCount: existingSubmission.submissionCount + 1,
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
    if (args.teamId) {
      return await ctx.db
        .query("submissions")
        .withIndex("by_hackathonId_teamId", (q) =>
          q.eq("hackathonId", args.hackathonId).eq("teamId", args.teamId!)
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("submissions")
      .withIndex("by_hackathonId", (q) =>
        q.eq("hackathonId", args.hackathonId)
      )
      .order("desc")
      .collect();
  },
});

export const listForTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.submissionId);
  },
});

export const getLatestForTeam = query({
  args: {
    hackathonId: v.id("hackathons"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_hackathonId_teamId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("teamId", args.teamId)
      )
      .order("desc")
      .first();
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
