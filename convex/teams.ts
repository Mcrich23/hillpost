import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    hackathonId: v.id("hackathons"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify user is a member of this hackathon
    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", userId)
      )
      .first();
    if (!membership) {
      throw new Error("You must be a member of this hackathon");
    }

    const teamId = await ctx.db.insert("teams", {
      hackathonId: args.hackathonId,
      name: args.name,
      createdAt: Date.now(),
    });

    // Automatically assign the creator to this team
    await ctx.db.patch(membership._id, { teamId });

    return teamId;
  },
});

export const list = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_hackathonId", (q) => q.eq("hackathonId", args.hackathonId))
      .collect();

    // Enrich with member info
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await ctx.db
          .query("hackathonMembers")
          .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
          .collect();
        return { ...team, members };
      })
    );

    return teamsWithMembers;
  },
});

export const get = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const members = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
      .collect();

    return { ...team, members };
  },
});

export const getMyTeam = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", identity.subject)
      )
      .first();

    if (!membership || !membership.teamId) {
      return null;
    }

    const team = await ctx.db.get(membership.teamId);
    if (!team) return null;

    const members = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
      .collect();

    return { ...team, members };
  },
});

export const joinTeam = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", team.hackathonId).eq("userId", identity.subject)
      )
      .first();
    if (!membership) {
      throw new Error("You must be a member of this hackathon");
    }

    if (membership.teamId) {
      throw new Error("You are already on a team. Leave your current team first.");
    }

    await ctx.db.patch(membership._id, { teamId: args.teamId });
    return args.teamId;
  },
});

export const leaveTeam = mutation({
  args: {
    hackathonId: v.id("hackathons"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", identity.subject)
      )
      .first();
    if (!membership) {
      throw new Error("You are not a member of this hackathon");
    }
    if (!membership.teamId) {
      throw new Error("You are not on a team");
    }

    await ctx.db.patch(membership._id, { teamId: undefined });
  },
});
