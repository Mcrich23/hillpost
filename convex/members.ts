import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getMyMembership = query({
  args: {
    hackathonId: v.id("hackathons"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return null;
    }

    return await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", args.userId!)
      )
      .first();
  },
});

export const listMembers = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId", (q) =>
        q.eq("hackathonId", args.hackathonId)
      )
      .collect();
  },
});

export const updateRole = mutation({
  args: {
    memberId: v.id("hackathonMembers"),
    role: v.union(
      v.literal("organizer"),
      v.literal("judge"),
      v.literal("competitor")
    ),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Verify caller is an organizer
    const callerMembership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q
          .eq("hackathonId", member.hackathonId)
          .eq("userId", args.userId)
      )
      .first();
    if (!callerMembership || callerMembership.role !== "organizer") {
      throw new Error("Only organizers can update roles");
    }

    await ctx.db.patch(args.memberId, { role: args.role });
    return args.memberId;
  },
});

export const removeMember = mutation({
  args: {
    memberId: v.id("hackathonMembers"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Verify caller is an organizer
    const callerMembership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q
          .eq("hackathonId", member.hackathonId)
          .eq("userId", args.userId)
      )
      .first();
    if (!callerMembership || callerMembership.role !== "organizer") {
      throw new Error("Only organizers can remove members");
    }

    // Prevent removing yourself
    if (member.userId === args.userId) {
      throw new Error("You cannot remove yourself");
    }

    await ctx.db.delete(args.memberId);
  },
});
