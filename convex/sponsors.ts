import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuthUserId } from "./auth";

async function verifyOrganizer(
  ctx: MutationCtx,
  hackathonId: Id<"hackathons">,
  userId: string,
) {
  const membership = await ctx.db
    .query("hackathonMembers")
    .withIndex("by_hackathonId_userId", (q) =>
      q.eq("hackathonId", hackathonId).eq("userId", userId)
    )
    .first();
  if (!membership || membership.role !== "organizer") {
    throw new Error("Only organizers can manage sponsors");
  }
}

export const list = query({
  args: { hackathonId: v.id("hackathons") },
  handler: async (ctx, args) => {
    const sponsors = await ctx.db
      .query("sponsors")
      .withIndex("by_hackathonId", (q) =>
        q.eq("hackathonId", args.hackathonId)
      )
      .order("asc")
      .collect();
    sponsors.sort((a, b) => {
      const aOrder = (a as any).order ?? 0;
      const bOrder = (b as any).order ?? 0;
      return aOrder - bOrder;
    });
    return sponsors;
  },
});

export const create = mutation({
  args: {
    hackathonId: v.id("hackathons"),
    name: v.string(),
    pfpUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    displayStyle: v.optional(
      v.union(
        v.literal("featured"),
        v.literal("large"),
        v.literal("medium"),
        v.literal("small")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await verifyOrganizer(ctx, args.hackathonId, userId);
    const existing = await ctx.db
      .query("sponsors")
      .withIndex("by_hackathonId", (q) =>
        q.eq("hackathonId", args.hackathonId)
      )
      .collect();
    return ctx.db.insert("sponsors", {
      hackathonId: args.hackathonId,
      name: args.name.trim(),
      pfpUrl: args.pfpUrl?.trim() || undefined,
      bannerUrl: args.bannerUrl?.trim() || undefined,
      websiteUrl: args.websiteUrl?.trim() || undefined,
      displayStyle: args.displayStyle ?? "medium",
      order: existing.length,
    });
  },
});

export const update = mutation({
  args: {
    sponsorId: v.id("sponsors"),
    name: v.string(),
    pfpUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    displayStyle: v.optional(
      v.union(
        v.literal("featured"),
        v.literal("large"),
        v.literal("medium"),
        v.literal("small")
      )
    ),
  },
  handler: async (ctx, args) => {
    const sponsor = await ctx.db.get(args.sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");
    const userId = await requireAuthUserId(ctx);
    await verifyOrganizer(ctx, sponsor.hackathonId, userId);
    await ctx.db.patch(args.sponsorId, {
      name: args.name.trim(),
      pfpUrl: args.pfpUrl?.trim() || undefined,
      bannerUrl: args.bannerUrl?.trim() || undefined,
      websiteUrl: args.websiteUrl?.trim() || undefined,
      displayStyle: args.displayStyle ?? "medium",
    });
  },
});

export const remove = mutation({
  args: { sponsorId: v.id("sponsors") },
  handler: async (ctx, args) => {
    const sponsor = await ctx.db.get(args.sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");
    const userId = await requireAuthUserId(ctx);
    await verifyOrganizer(ctx, sponsor.hackathonId, userId);
    await ctx.db.delete(args.sponsorId);
  },
});
