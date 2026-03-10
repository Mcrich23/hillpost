import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId, requireAuthUserId, getAuthUserName } from "./auth";

function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    submissionFrequencyMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const userName = await getAuthUserName(ctx);

    let competitorJoinCode = generateJoinCode();
    let judgeJoinCode = generateJoinCode();

    // Ensure uniqueness for both
    const ensureUnique = async (code: string, field: "competitorJoinCode" | "judgeJoinCode") => {
      let uniqueCode = code;
      let existing = await ctx.db
        .query("hackathons")
        .withIndex(`by_${field}` as any, (q) => q.eq(field, uniqueCode))
        .first();
      while (existing) {
        uniqueCode = generateJoinCode();
        existing = await ctx.db
          .query("hackathons")
          .withIndex(`by_${field}` as any, (q) => q.eq(field, uniqueCode))
          .first();
      }
      return uniqueCode;
    };

    competitorJoinCode = await ensureUnique(competitorJoinCode, "competitorJoinCode");
    judgeJoinCode = await ensureUnique(judgeJoinCode, "judgeJoinCode");

    const now = Date.now();
    const hackathonId = await ctx.db.insert("hackathons", {
      name: args.name,
      description: args.description,
      organizerId: userId,
      startDate: args.startDate,
      endDate: args.endDate,
      submissionFrequencyMinutes: args.submissionFrequencyMinutes ?? 60,
      isActive: true,
      competitorJoinCode,
      judgeJoinCode,
      createdAt: now,
    });

    // Auto-add creator as organizer member
    await ctx.db.insert("hackathonMembers", {
      hackathonId,
      userId,
      userName,
      role: "organizer",
      status: "approved",
      joinedAt: now,
    });

    return hackathonId;
  },
});

export const get = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon) return null;

    // Only organizers can see join codes
    const userId = await getAuthUserId(ctx);
    if (userId) {
      const membership = await ctx.db
        .query("hackathonMembers")
        .withIndex("by_hackathonId_userId", (q) =>
          q.eq("hackathonId", args.hackathonId).eq("userId", userId)
        )
        .first();
      if (membership && membership.role === "organizer") {
        return hackathon;
      }
    }

    // Strip sensitive join codes for non-organizers
    const { competitorJoinCode: _c, judgeJoinCode: _j, ...safeHackathon } = hackathon;
    return safeHackathon;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const hackathons = await ctx.db.query("hackathons").collect();
    // Strip join codes from public listing
    return hackathons.map(({ competitorJoinCode: _c, judgeJoinCode: _j, ...safe }) => safe);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const hackathons = await Promise.all(
      memberships.map(async (m) => {
        const hackathon = await ctx.db.get(m.hackathonId);
        if (!hackathon) return null;
        // Only include join codes for organizers
        if (m.role === "organizer") {
          return { ...hackathon, myRole: m.role };
        }
        const { competitorJoinCode: _c, judgeJoinCode: _j, ...safe } = hackathon;
        return { ...safe, myRole: m.role };
      })
    );

    return hackathons.filter(Boolean);
  },
});

export const update = mutation({
  args: {
    hackathonId: v.id("hackathons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    submissionFrequencyMinutes: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon) {
      throw new Error("Hackathon not found");
    }

    // Verify organizer role
    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", userId)
      )
      .first();
    if (!membership || membership.role !== "organizer") {
      throw new Error("Only organizers can update hackathons");
    }

    await ctx.db.patch(args.hackathonId, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.startDate !== undefined && { startDate: args.startDate }),
      ...(args.endDate !== undefined && { endDate: args.endDate }),
      ...(args.submissionFrequencyMinutes !== undefined && {
        submissionFrequencyMinutes: args.submissionFrequencyMinutes,
      }),
      ...(args.isActive !== undefined && { isActive: args.isActive }),
    });
    return args.hackathonId;
  },
});

export const join = mutation({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const userName = await getAuthUserName(ctx);

    let hackathon = await ctx.db
      .query("hackathons")
      .withIndex("by_competitorJoinCode", (q) => q.eq("competitorJoinCode", args.joinCode))
      .first();
    
    let role: "competitor" | "judge" = "competitor";
    let status: "approved" | "pending" | "rejected" = "approved";

    if (!hackathon) {
      hackathon = await ctx.db
        .query("hackathons")
        .withIndex("by_judgeJoinCode", (q) => q.eq("judgeJoinCode", args.joinCode))
        .first();
      role = "judge";
      status = "pending";
    }

    if (!hackathon) {
      throw new Error("Invalid join code");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", hackathon._id).eq("userId", userId)
      )
      .first();
    if (existing) {
      return { hackathonId: hackathon._id, alreadyMember: true };
    }

    await ctx.db.insert("hackathonMembers", {
      hackathonId: hackathon._id,
      userId,
      userName,
      role,
      status,
      joinedAt: Date.now(),
    });

    return { hackathonId: hackathon._id, alreadyMember: false };
  },
});

export const getByJoinCode = query({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    let hackathon = await ctx.db
      .query("hackathons")
      .withIndex("by_competitorJoinCode", (q) => q.eq("competitorJoinCode", args.joinCode))
      .first();

    let roleForCode: "competitor" | "judge" = "competitor";

    if (!hackathon) {
      hackathon = await ctx.db
        .query("hackathons")
        .withIndex("by_judgeJoinCode", (q) => q.eq("judgeJoinCode", args.joinCode))
        .first();
      roleForCode = "judge";
    }
    if (!hackathon) return null;

    // Strip join codes — this query is used for preview before joining
    const { competitorJoinCode: _c, judgeJoinCode: _j, ...safe } = hackathon;
    return { ...safe, roleForCode };
  },
});
