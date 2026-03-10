import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    hackathonId: v.id("hackathons"),
    teamId: v.id("teams"),
    name: v.string(),
    description: v.string(),
    projectUrl: v.string(),
    demoUrl: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;

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

    // Rate limiting: check the team's latest submission
    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon) {
      throw new Error("Hackathon not found");
    }

    const latestSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_hackathonId_teamId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("teamId", args.teamId)
      )
      .order("desc")
      .first();

    if (latestSubmission) {
      const cooldownMs = hackathon.submissionFrequencyMinutes * 60 * 1000;
      const timeSinceLastSubmission = Date.now() - latestSubmission.submittedAt;
      if (timeSinceLastSubmission < cooldownMs) {
        const remainingMinutes = Math.ceil(
          (cooldownMs - timeSinceLastSubmission) / 60000
        );
        throw new Error(
          `Rate limited. Please wait ${remainingMinutes} more minute(s) before submitting again.`
        );
      }
    }

    return await ctx.db.insert("submissions", {
      hackathonId: args.hackathonId,
      teamId: args.teamId,
      name: args.name,
      description: args.description,
      projectUrl: args.projectUrl,
      demoUrl: args.demoUrl,
      submittedAt: Date.now(),
      submittedBy: userId,
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
