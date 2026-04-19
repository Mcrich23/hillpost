import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, getAuthUserId, getAuthUserName } from "./auth";

function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function stripJoinCodes<T extends { competitorJoinCode: string; judgeJoinCode: string }>(
  hackathon: T
): Omit<T, "competitorJoinCode" | "judgeJoinCode"> {
  const sanitized: Partial<T> = { ...hackathon };
  delete sanitized.competitorJoinCode;
  delete sanitized.judgeJoinCode;
  return sanitized as Omit<T, "competitorJoinCode" | "judgeJoinCode">;
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    submissionFrequencyMinutes: v.optional(v.number()),
    openGraphImageUrl: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    userImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const userName = await getAuthUserName(ctx);

    let competitorJoinCode = generateJoinCode();
    let judgeJoinCode = generateJoinCode();

    // Ensure uniqueness for both
    const ensureUniqueCompetitor = async (code: string): Promise<string> => {
      let uniqueCode = code;
      let existing = await ctx.db
        .query("hackathons")
        .withIndex("by_competitorJoinCode", (q) => q.eq("competitorJoinCode", uniqueCode))
        .first();
      while (existing) {
        uniqueCode = generateJoinCode();
        existing = await ctx.db
          .query("hackathons")
          .withIndex("by_competitorJoinCode", (q) => q.eq("competitorJoinCode", uniqueCode))
          .first();
      }
      return uniqueCode;
    };

    const ensureUniqueJudge = async (code: string): Promise<string> => {
      let uniqueCode = code;
      let existing = await ctx.db
        .query("hackathons")
        .withIndex("by_judgeJoinCode", (q) => q.eq("judgeJoinCode", uniqueCode))
        .first();
      while (existing) {
        uniqueCode = generateJoinCode();
        existing = await ctx.db
          .query("hackathons")
          .withIndex("by_judgeJoinCode", (q) => q.eq("judgeJoinCode", uniqueCode))
          .first();
      }
      return uniqueCode;
    };

    competitorJoinCode = await ensureUniqueCompetitor(competitorJoinCode);
    judgeJoinCode = await ensureUniqueJudge(judgeJoinCode);

    const sanitizedOpenGraphImageUrl =
      args.openGraphImageUrl === undefined
        ? undefined
        : sanitizeUrl(args.openGraphImageUrl);

    if (sanitizedOpenGraphImageUrl === null) {
      throw new Error("Invalid openGraphImageUrl");
    }

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
      ...(sanitizedOpenGraphImageUrl !== undefined && {
        openGraphImageUrl: sanitizedOpenGraphImageUrl,
      }),
      isPublic: args.isPublic ?? false,
      createdAt: now,
    });

    // Auto-add creator as organizer member
    await ctx.db.insert("hackathonMembers", {
      hackathonId,
      userId,
      userName,
      userImageUrl: args.userImageUrl,
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

    const userId = await getAuthUserId(ctx);

    let competitorJoinCode: string | undefined;
    let judgeJoinCode: string | undefined;

    if (userId) {
      const membership = await ctx.db
        .query("hackathonMembers")
        .withIndex("by_hackathonId_userId", (q) =>
          q.eq("hackathonId", args.hackathonId).eq("userId", userId)
        )
        .first();

      if (membership?.role === "organizer") {
        competitorJoinCode = hackathon.competitorJoinCode;
        judgeJoinCode = hackathon.judgeJoinCode;
      } else if (membership?.role === "competitor") {
        competitorJoinCode = hackathon.competitorJoinCode;
      }
    }

    // Return a consistent shape; hidden codes are undefined
    const rest = stripJoinCodes(hackathon);
    return { ...rest, competitorJoinCode, judgeJoinCode };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const hackathons = await ctx.db.query("hackathons").collect();
    // Strip all join codes from the public list
    return hackathons.map((hackathon) => stripJoinCodes(hackathon));
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

        const { competitorJoinCode, judgeJoinCode, ...rest } = hackathon;

        // Return a consistent shape for all roles; hide codes by setting them to undefined.
        if (m.role === "organizer") {
          // Organizers see both join codes.
          return {
            ...rest,
            competitorJoinCode,
            judgeJoinCode,
            myRole: m.role,
          };
        }

        if (m.role === "competitor") {
          // Competitors see only competitorJoinCode.
          return {
            ...rest,
            competitorJoinCode,
            judgeJoinCode: undefined,
            myRole: m.role,
          };
        }

        // Judges see neither join code.
        return {
          ...rest,
          competitorJoinCode: undefined,
          judgeJoinCode: undefined,
          myRole: m.role,
        };
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
    openGraphImageUrl: v.optional(v.union(v.string(), v.null())),
    isPublic: v.optional(v.boolean()),
    feedbackVisible: v.optional(v.boolean()),
    scoresVisible: v.optional(v.boolean()),
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

    const sanitizedOpenGraphImageUrl =
      args.openGraphImageUrl === undefined
        ? undefined
        : args.openGraphImageUrl === null
        ? null
        : sanitizeUrl(args.openGraphImageUrl);

    if (sanitizedOpenGraphImageUrl === null && args.openGraphImageUrl !== null && args.openGraphImageUrl !== undefined) {
      throw new Error("Invalid openGraphImageUrl");
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
      ...(args.openGraphImageUrl !== undefined && {
        openGraphImageUrl:
          sanitizedOpenGraphImageUrl === null ? undefined : sanitizedOpenGraphImageUrl,
      }),
      ...(args.isPublic !== undefined && { isPublic: args.isPublic }),
      ...(args.feedbackVisible !== undefined && { feedbackVisible: args.feedbackVisible }),
      ...(args.scoresVisible !== undefined && { scoresVisible: args.scoresVisible }),
    });
    return args.hackathonId;
  },
});

export const join = mutation({
  args: {
    joinCode: v.string(),
    userImageUrl: v.optional(v.string()),
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
      userImageUrl: args.userImageUrl,
      role,
      status,
      joinedAt: Date.now(),
    });

    return { hackathonId: hackathon._id, alreadyMember: false };
  },
});

export const joinPublic = mutation({
  args: {
    hackathonId: v.id("hackathons"),
    userImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const userName = await getAuthUserName(ctx);

    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon || hackathon.isPublic !== true) {
      throw new Error("Hackathon is not publicly joinable");
    }

    const existing = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", (q) =>
        q.eq("hackathonId", args.hackathonId).eq("userId", userId)
      )
      .first();
    if (existing) {
      return { hackathonId: args.hackathonId, alreadyMember: true };
    }

    await ctx.db.insert("hackathonMembers", {
      hackathonId: args.hackathonId,
      userId,
      userName,
      userImageUrl: args.userImageUrl,
      role: "competitor",
      status: "approved",
      joinedAt: Date.now(),
    });

    return { hackathonId: args.hackathonId, alreadyMember: false };
  },
});

export const getByJoinCode = query({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    let hackathon = await ctx.db
      .query("hackathons")
      .withIndex("by_competitorJoinCode", (q) => q.eq("competitorJoinCode", args.joinCode))
      .first();
    let role: "competitor" | "judge" = "competitor";
    if (!hackathon) {
      hackathon = await ctx.db
        .query("hackathons")
        .withIndex("by_judgeJoinCode", (q) => q.eq("judgeJoinCode", args.joinCode))
        .first();
      role = "judge";
    }
    if (!hackathon) return null;
    // Strip both join codes — this query is used pre-join for display only
    const rest = stripJoinCodes(hackathon);
    return { ...rest, role };
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const hackathons = await ctx.db
      .query("hackathons")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect();
    return hackathons
      .filter((h) => h.endDate >= now)
      .map((hackathon) => stripJoinCodes(hackathon));
  },
});
