/**
 * MCP-facing Convex functions.
 * Each function accepts a `token` string for authentication instead of relying
 * on Clerk session auth. The token is validated against the mcpTokens table.
 */
import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Token validation helper
// ---------------------------------------------------------------------------

async function validateToken(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<{ userId: string; userName: string }> {
  const record = await ctx.db
    .query("mcpTokens")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (!record) {
    throw new Error("Invalid or expired MCP token. Generate a new one from your Hillpost account.");
  }
  return { userId: record.userId, userName: record.userName };
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const whoami = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId, userName } = await validateToken(ctx, args.token);

    const memberships = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const hackathons = await Promise.all(
      memberships.map(async (m) => {
        const hackathon = await ctx.db.get(m.hackathonId);
        if (!hackathon) return null;
        return {
          hackathonId: m.hackathonId,
          hackathonName: hackathon.name,
          role: m.role,
          status: m.status,
          teamId: m.teamId,
        };
      })
    );

    const active = hackathons.filter(Boolean) as NonNullable<typeof hackathons[0]>[];

    return {
      userId,
      userName,
      hackathons: active,
      summary: active.length === 0
        ? `Hi ${userName}, you are not a member of any hackathon yet.`
        : `Hi ${userName}! ${active.map(h =>
            `You are a ${h.role} for "${h.hackathonName}"${h.status !== "approved" ? ` (${h.status})` : ""}`
          ).join(", ")}.`,
    };
  },
});

// ---------------------------------------------------------------------------
// Membership helper (any role, approved status)
// ---------------------------------------------------------------------------

async function requireMembership(
  ctx: QueryCtx | MutationCtx,
  hackathonId: Id<"hackathons">,
  userId: string
) {
  const m = await ctx.db
    .query("hackathonMembers")
    .withIndex("by_hackathonId_userId", (q) =>
      q.eq("hackathonId", hackathonId).eq("userId", userId)
    )
    .first();
  if (!m) throw new Error("You are not a member of this hackathon");
  return m;
}

// ---------------------------------------------------------------------------
// Hackathons
// ---------------------------------------------------------------------------

export const getHackathon = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);

    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon) throw new Error("Hackathon not found");

    const membership = await requireMembership(ctx, args.hackathonId, userId);

    const { competitorJoinCode, judgeJoinCode, ...rest } = hackathon;

    if (membership.role === "organizer") {
      return { ...rest, competitorJoinCode, judgeJoinCode, myRole: membership.role };
    }
    if (membership.role === "competitor") {
      return { ...rest, competitorJoinCode, judgeJoinCode: undefined, myRole: membership.role };
    }
    return { ...rest, competitorJoinCode: undefined, judgeJoinCode: undefined, myRole: membership.role };
  },
});

function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

async function uniqueCompetitorCode(ctx: MutationCtx): Promise<string> {
  let code = generateJoinCode();
  while (await ctx.db.query("hackathons").withIndex("by_competitorJoinCode", q => q.eq("competitorJoinCode", code)).first()) {
    code = generateJoinCode();
  }
  return code;
}

async function uniqueJudgeCode(ctx: MutationCtx): Promise<string> {
  let code = generateJoinCode();
  while (await ctx.db.query("hackathons").withIndex("by_judgeJoinCode", q => q.eq("judgeJoinCode", code)).first()) {
    code = generateJoinCode();
  }
  return code;
}

export const createHackathon = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    submissionFrequencyMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, userName } = await validateToken(ctx, args.token);

    const competitorJoinCode = await uniqueCompetitorCode(ctx);
    const judgeJoinCode = await uniqueJudgeCode(ctx);
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

    await ctx.db.insert("hackathonMembers", {
      hackathonId,
      userId,
      userName,
      role: "organizer",
      status: "approved",
      joinedAt: now,
    });

    return { hackathonId, competitorJoinCode, judgeJoinCode };
  },
});

export const updateHackathon = mutation({
  args: {
    token: v.string(),
    hackathonId: v.id("hackathons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    submissionFrequencyMinutes: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireOrganizerRole(ctx, args.hackathonId, userId);

    const { token: _t, hackathonId, ...patch } = args;
    const updates = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(hackathonId, updates);
    return hackathonId;
  },
});

// ---------------------------------------------------------------------------
// Member management (organizer)
// ---------------------------------------------------------------------------

async function requireOrganizerRole(
  ctx: QueryCtx | MutationCtx,
  hackathonId: Id<"hackathons">,
  userId: string
) {
  const m = await ctx.db
    .query("hackathonMembers")
    .withIndex("by_hackathonId_userId", q => q.eq("hackathonId", hackathonId).eq("userId", userId))
    .first();
  if (!m || m.role !== "organizer") throw new Error("Only organizers can perform this action");
  return m;
}

export const listMembers = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireOrganizerRole(ctx, args.hackathonId, userId);
    return ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId", q => q.eq("hackathonId", args.hackathonId))
      .collect();
  },
});

export const approveMember = mutation({
  args: { token: v.string(), memberId: v.id("hackathonMembers") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    await requireOrganizerRole(ctx, member.hackathonId, userId);
    await ctx.db.patch(args.memberId, { status: "approved" });
    return args.memberId;
  },
});

export const rejectMember = mutation({
  args: { token: v.string(), memberId: v.id("hackathonMembers") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    await requireOrganizerRole(ctx, member.hackathonId, userId);
    await ctx.db.patch(args.memberId, { status: "rejected" });
    return args.memberId;
  },
});

export const removeMember = mutation({
  args: { token: v.string(), memberId: v.id("hackathonMembers") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    await requireOrganizerRole(ctx, member.hackathonId, userId);
    if (member.userId === userId) throw new Error("You cannot remove yourself");
    await ctx.db.delete(args.memberId);
  },
});

// ---------------------------------------------------------------------------
// Categories (organizer)
// ---------------------------------------------------------------------------

export const createCategory = mutation({
  args: {
    token: v.string(),
    hackathonId: v.id("hackathons"),
    name: v.string(),
    description: v.string(),
    maxScore: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireOrganizerRole(ctx, args.hackathonId, userId);

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_hackathonId", q => q.eq("hackathonId", args.hackathonId))
      .collect();
    const order = existing.reduce((max, c) => Math.max(max, c.order), -1) + 1;

    return ctx.db.insert("categories", {
      hackathonId: args.hackathonId,
      name: args.name,
      description: args.description,
      maxScore: args.maxScore,
      order,
    });
  },
});

export const updateCategory = mutation({
  args: {
    token: v.string(),
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    maxScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new Error("Category not found");
    await requireOrganizerRole(ctx, cat.hackathonId, userId);

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.maxScore !== undefined) patch.maxScore = args.maxScore;
    await ctx.db.patch(args.categoryId, patch);
    return args.categoryId;
  },
});

export const deleteCategory = mutation({
  args: { token: v.string(), categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const cat = await ctx.db.get(args.categoryId);
    if (!cat) throw new Error("Category not found");
    await requireOrganizerRole(ctx, cat.hackathonId, userId);
    await ctx.db.delete(args.categoryId);
  },
});

export const listCategories = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireMembership(ctx, args.hackathonId, userId);
    const cats = await ctx.db
      .query("categories")
      .withIndex("by_hackathonId", q => q.eq("hackathonId", args.hackathonId))
      .collect();
    return cats.sort((a, b) => a.order - b.order);
  },
});

// ---------------------------------------------------------------------------
// Sponsors (organizer)
// ---------------------------------------------------------------------------

function sanitizeUrl(url: string | undefined, field: string): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid URL scheme for ${field}`);
  }
  return trimmed;
}

export const listSponsors = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireMembership(ctx, args.hackathonId, userId);
    return ctx.db
      .query("sponsors")
      .withIndex("by_hackathonId_order", q => q.eq("hackathonId", args.hackathonId))
      .order("asc")
      .collect();
  },
});

export const createSponsor = mutation({
  args: {
    token: v.string(),
    hackathonId: v.id("hackathons"),
    name: v.string(),
    websiteUrl: v.optional(v.string()),
    displayStyle: v.optional(v.union(
      v.literal("featured"), v.literal("large"), v.literal("medium"), v.literal("small")
    )),
    badgeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireOrganizerRole(ctx, args.hackathonId, userId);

    const existing = await ctx.db
      .query("sponsors")
      .withIndex("by_hackathonId", q => q.eq("hackathonId", args.hackathonId))
      .collect();
    const order = existing.reduce((max, s) => Math.max(max, s.order ?? -1), -1) + 1;

    return ctx.db.insert("sponsors", {
      hackathonId: args.hackathonId,
      name: args.name.trim(),
      websiteUrl: sanitizeUrl(args.websiteUrl, "websiteUrl"),
      displayStyle: args.displayStyle ?? "medium",
      order,
      badgeText: args.badgeText?.trim() || undefined,
    });
  },
});

export const updateSponsor = mutation({
  args: {
    token: v.string(),
    sponsorId: v.id("sponsors"),
    name: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    displayStyle: v.optional(v.union(
      v.literal("featured"), v.literal("large"), v.literal("medium"), v.literal("small")
    )),
    badgeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const sponsor = await ctx.db.get(args.sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");
    await requireOrganizerRole(ctx, sponsor.hackathonId, userId);

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.websiteUrl !== undefined) patch.websiteUrl = sanitizeUrl(args.websiteUrl, "websiteUrl");
    if (args.displayStyle !== undefined) patch.displayStyle = args.displayStyle;
    if (args.badgeText !== undefined) patch.badgeText = args.badgeText?.trim() || undefined;
    await ctx.db.patch(args.sponsorId, patch);
    return args.sponsorId;
  },
});

export const deleteSponsor = mutation({
  args: { token: v.string(), sponsorId: v.id("sponsors") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const sponsor = await ctx.db.get(args.sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");
    await requireOrganizerRole(ctx, sponsor.hackathonId, userId);
    await ctx.db.delete(args.sponsorId);
  },
});

// ---------------------------------------------------------------------------
// Join hackathon (any authenticated user)
// ---------------------------------------------------------------------------

export const joinHackathon = mutation({
  args: { token: v.string(), joinCode: v.string() },
  handler: async (ctx, args) => {
    const { userId, userName } = await validateToken(ctx, args.token);

    let hackathon = await ctx.db
      .query("hackathons")
      .withIndex("by_competitorJoinCode", q => q.eq("competitorJoinCode", args.joinCode))
      .first();
    let role: "competitor" | "judge" = "competitor";
    let status: "approved" | "pending" = "approved";

    if (!hackathon) {
      hackathon = await ctx.db
        .query("hackathons")
        .withIndex("by_judgeJoinCode", q => q.eq("judgeJoinCode", args.joinCode))
        .first();
      role = "judge";
      status = "pending";
    }

    if (!hackathon) throw new Error("Invalid join code");

    const existing = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", q =>
        q.eq("hackathonId", hackathon!._id).eq("userId", userId)
      )
      .first();

    if (existing) return { hackathonId: hackathon._id, alreadyMember: true, role: existing.role };

    await ctx.db.insert("hackathonMembers", {
      hackathonId: hackathon._id,
      userId,
      userName,
      role,
      status,
      joinedAt: Date.now(),
    });

    return { hackathonId: hackathon._id, alreadyMember: false, role };
  },
});

// ---------------------------------------------------------------------------
// Teams (competitor)
// ---------------------------------------------------------------------------

async function requireCompetitorInHackathon(
  ctx: QueryCtx | MutationCtx,
  hackathonId: Id<"hackathons">,
  userId: string
) {
  const m = await ctx.db
    .query("hackathonMembers")
    .withIndex("by_hackathonId_userId", q => q.eq("hackathonId", hackathonId).eq("userId", userId))
    .first();
  if (!m) throw new Error("You are not a member of this hackathon");
  if (m.role !== "competitor") throw new Error("Only competitors can perform this action");
  return m;
}

export const listTeams = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireMembership(ctx, args.hackathonId, userId);
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_hackathonId", q => q.eq("hackathonId", args.hackathonId))
      .collect();

    return Promise.all(teams.map(async (team) => {
      const members = await ctx.db
        .query("hackathonMembers")
        .withIndex("by_teamId", q => q.eq("teamId", team._id))
        .collect();
      return { ...team, members: members.map(m => ({ userId: m.userId, userName: m.userName })) };
    }));
  },
});

export const createTeam = mutation({
  args: { token: v.string(), hackathonId: v.id("hackathons"), name: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const membership = await requireCompetitorInHackathon(ctx, args.hackathonId, userId);

    const teamId = await ctx.db.insert("teams", {
      hackathonId: args.hackathonId,
      name: args.name,
      createdAt: Date.now(),
    });

    await ctx.db.patch(membership._id, { teamId });
    return teamId;
  },
});

export const joinTeam = mutation({
  args: { token: v.string(), teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    const membership = await requireCompetitorInHackathon(ctx, team.hackathonId, userId);
    if (membership.teamId) throw new Error("You are already on a team. Leave your current team first.");

    await ctx.db.patch(membership._id, { teamId: args.teamId });
    return args.teamId;
  },
});

export const leaveTeam = mutation({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const membership = await requireCompetitorInHackathon(ctx, args.hackathonId, userId);
    if (!membership.teamId) throw new Error("You are not on a team");
    await ctx.db.patch(membership._id, { teamId: undefined });
  },
});

// ---------------------------------------------------------------------------
// Submissions (competitor)
// ---------------------------------------------------------------------------

function sanitizeSubmissionUrl(url: string | undefined, field: string, required: boolean): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) {
    if (required) throw new Error(`${field} is required`);
    return undefined;
  }
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid URL scheme for ${field}`);
  }
  return trimmed;
}

export const submitProject = mutation({
  args: {
    token: v.string(),
    hackathonId: v.id("hackathons"),
    name: v.string(),
    description: v.string(),
    projectUrl: v.string(),
    demoUrl: v.optional(v.string()),
    deployedUrl: v.optional(v.string()),
    whatsNew: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    const membership = await requireCompetitorInHackathon(ctx, args.hackathonId, userId);

    if (!membership.teamId) throw new Error("You must be on a team before submitting");

    const name = args.name.trim();
    const description = args.description.trim();
    if (!name) throw new Error("Name is required");
    if (!description) throw new Error("Description is required");

    const projectUrl = sanitizeSubmissionUrl(args.projectUrl, "Project URL", true)!;
    const demoUrl = sanitizeSubmissionUrl(args.demoUrl, "Video URL", false);
    const deployedUrl = sanitizeSubmissionUrl(args.deployedUrl, "Deployment URL", false);

    const hackathon = await ctx.db.get(args.hackathonId);
    if (!hackathon) throw new Error("Hackathon not found");

    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_hackathonId_teamId", q =>
        q.eq("hackathonId", args.hackathonId).eq("teamId", membership.teamId!)
      )
      .first();

    if (existing) {
      const cooldownMs = hackathon.submissionFrequencyMinutes * 60 * 1000;
      const elapsed = Date.now() - existing.submittedAt;
      if (elapsed < cooldownMs) {
        const remaining = Math.max(1, Math.ceil((cooldownMs - elapsed) / 60000));
        throw new Error(`Rate limited. Please wait ${remaining} more minute(s).`);
      }

      const scores = await ctx.db
        .query("scores")
        .withIndex("by_submissionId", q => q.eq("submissionId", existing._id))
        .collect();
      const baselineScore = scores.length > 0
        ? scores.reduce((s, sc) => s + sc.score, 0) / scores.length
        : undefined;

      const now = Date.now();
      const newCount = existing.submissionCount + 1;
      const changelog = [
        ...(existing.changelog ?? []),
        { submissionCount: newCount, whatsNew: args.whatsNew?.trim() || undefined, submittedAt: now },
      ];

      await ctx.db.patch(existing._id, {
        name, description, projectUrl, demoUrl, deployedUrl,
        whatsNew: undefined,
        changelog,
        submittedAt: now,
        submittedBy: userId,
        submissionCount: newCount,
        judgedBy: [],
        baselineScore,
        baselineJudgeCount: existing.judgedBy.length,
      });
      return existing._id;
    }

    return ctx.db.insert("submissions", {
      hackathonId: args.hackathonId,
      teamId: membership.teamId,
      name, description, projectUrl, demoUrl, deployedUrl,
      submittedAt: Date.now(),
      submittedBy: userId,
      submissionCount: 1,
      judgedBy: [],
    });
  },
});

export const getMySubmission = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);

    const membership = await ctx.db
      .query("hackathonMembers")
      .withIndex("by_hackathonId_userId", q =>
        q.eq("hackathonId", args.hackathonId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.teamId) return null;

    return ctx.db
      .query("submissions")
      .withIndex("by_hackathonId_teamId", q =>
        q.eq("hackathonId", args.hackathonId).eq("teamId", membership.teamId!)
      )
      .order("desc")
      .first();
  },
});

// ---------------------------------------------------------------------------
// Scoring (judge / organizer)
// ---------------------------------------------------------------------------

async function requireJudgeOrOrganizer(
  ctx: QueryCtx | MutationCtx,
  hackathonId: Id<"hackathons">,
  userId: string
) {
  const m = await ctx.db
    .query("hackathonMembers")
    .withIndex("by_hackathonId_userId", q => q.eq("hackathonId", hackathonId).eq("userId", userId))
    .first();
  if (!m) throw new Error("You are not a member of this hackathon");
  if (m.role !== "judge" && m.role !== "organizer") {
    throw new Error("Only judges and organizers can score submissions");
  }
  if (m.role === "judge" && m.status !== "approved") {
    throw new Error("Your judge status is pending approval");
  }
  return m;
}

export const listSubmissionsToJudge = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireJudgeOrOrganizer(ctx, args.hackathonId, userId);

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_hackathonId", q => q.eq("hackathonId", args.hackathonId))
      .collect();

    return submissions.map(s => ({
      _id: s._id,
      teamId: s.teamId,
      name: s.name,
      description: s.description,
      projectUrl: s.projectUrl,
      demoUrl: s.demoUrl,
      deployedUrl: s.deployedUrl,
      submissionCount: s.submissionCount,
      submittedAt: s.submittedAt,
      hasJudged: s.judgedBy.includes(userId),
    }));
  },
});

export const scoreSubmission = mutation({
  args: {
    token: v.string(),
    submissionId: v.id("submissions"),
    categoryId: v.id("categories"),
    score: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    await requireJudgeOrOrganizer(ctx, submission.hackathonId, userId);

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");
    if (args.score < 0 || args.score > category.maxScore) {
      throw new Error(`Score must be between 0 and ${category.maxScore}`);
    }

    const iteration = submission.submissionCount ?? 1;

    const existing = await ctx.db
      .query("scores")
      .withIndex("by_submissionId_categoryId_judgeId", q =>
        q.eq("submissionId", args.submissionId).eq("categoryId", args.categoryId).eq("judgeId", userId)
      )
      .filter(q => q.eq(q.field("submissionCount"), iteration))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { score: args.score, feedback: args.feedback, scoredAt: Date.now() });
      if (!submission.judgedBy.includes(userId)) {
        await ctx.db.patch(submission._id, { judgedBy: [...submission.judgedBy, userId] });
      }
      return existing._id;
    }

    const scoreId = await ctx.db.insert("scores", {
      submissionId: args.submissionId,
      categoryId: args.categoryId,
      judgeId: userId,
      score: args.score,
      feedback: args.feedback,
      scoredAt: Date.now(),
      submissionCount: iteration,
    });

    if (!submission.judgedBy.includes(userId)) {
      await ctx.db.patch(submission._id, { judgedBy: [...submission.judgedBy, userId] });
    }

    return scoreId;
  },
});

export const getMyScores = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireJudgeOrOrganizer(ctx, args.hackathonId, userId);

    return ctx.db
      .query("scores")
      .withIndex("by_judgeId", q => q.eq("judgeId", userId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Leaderboard (any authenticated user)
// ---------------------------------------------------------------------------

export const getLeaderboard = query({
  args: { token: v.string(), hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const { userId } = await validateToken(ctx, args.token);
    await requireMembership(ctx, args.hackathonId, userId);

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_hackathonId", q => q.eq("hackathonId", args.hackathonId))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_hackathonId", q => q.eq("hackathonId", args.hackathonId))
      .collect();
    const sortedCategories = categories.sort((a, b) => a.order - b.order);

    const entries = await Promise.all(teams.map(async (team) => {
      const submission = await ctx.db
        .query("submissions")
        .withIndex("by_hackathonId_teamId", q =>
          q.eq("hackathonId", args.hackathonId).eq("teamId", team._id)
        )
        .order("desc")
        .first();

      if (!submission) {
        return { teamId: team._id, teamName: team.name, overallScore: 0, categoryScores: [], rank: 0 };
      }

      const scores = await ctx.db
        .query("scores")
        .withIndex("by_submissionId", q => q.eq("submissionId", submission._id))
        .filter(q => q.eq(q.field("submissionCount"), submission.submissionCount))
        .collect();

      const categoryScores = sortedCategories.map(cat => {
        const catScores = scores.filter(s => s.categoryId === cat._id);
        const avg = catScores.length > 0
          ? catScores.reduce((sum, s) => sum + s.score, 0) / catScores.length
          : 0;
        return { categoryName: cat.name, maxScore: cat.maxScore, averageScore: avg };
      });

      const overallScore = categoryScores.reduce((sum, cs) => sum + cs.averageScore, 0);

      return {
        teamId: team._id,
        teamName: team.name,
        submissionName: submission.name,
        overallScore,
        categoryScores,
        rank: 0,
      };
    }));

    entries.sort((a, b) => b.overallScore - a.overallScore);
    entries.forEach((e, i) => { e.rank = i + 1; });

    return { entries, maxPossibleScore: sortedCategories.reduce((s, c) => s + c.maxScore, 0) };
  },
});
