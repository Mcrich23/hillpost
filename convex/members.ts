import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getMyMembership = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", identity.subject)
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

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
          .eq("userId", identity.subject)
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
  args: { memberId: v.id("hackathonMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

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
          .eq("userId", identity.subject)
      )
      .first();
    if (!callerMembership || callerMembership.role !== "organizer") {
      throw new Error("Only organizers can remove members");
    }

    // Prevent removing yourself
    if (member.userId === identity.subject) {
      throw new Error("You cannot remove yourself");
    }

    await ctx.db.delete(args.memberId);
  },
});
