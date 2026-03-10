import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    userId: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new Error("Not authenticated");
    }
    const userId = args.userId;

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
      userName: args.userName,
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
    return await ctx.db.get(args.hackathonId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("hackathons").collect();
  },
});

export const listMine = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return [];
    }
    const userId = args.userId;

    const memberships = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const hackathons = await Promise.all(
      memberships.map(async (m) => {
        const hackathon = await ctx.db.get(m.hackathonId);
        return hackathon ? { ...hackathon, myRole: m.role } : null;
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
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new Error("Not authenticated");
    }

    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon) {
      throw new Error("Hackathon not found");
    }

    // Verify organizer role
    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", args.userId)
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
    userId: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new Error("Not authenticated");
    }
    const userId = args.userId;

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
      throw new Error("Already a member of this hackathon");
    }

    await ctx.db.insert("hackathonMembers", {
      hackathonId: hackathon._id,
      userId,
      userName: args.userName,
      role,
      status,
      joinedAt: Date.now(),
    });

    return hackathon._id;
  },
});

export const getByJoinCode = query({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    let hackathon = await ctx.db
      .query("hackathons")
      .withIndex("by_competitorJoinCode", (q) => q.eq("competitorJoinCode", args.joinCode))
      .first();
    if (!hackathon) {
      hackathon = await ctx.db
        .query("hackathons")
        .withIndex("by_judgeJoinCode", (q) => q.eq("judgeJoinCode", args.joinCode))
        .first();
    }
    return hackathon;
  },
});
