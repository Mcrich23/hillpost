import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuthUserId } from "./auth";

function sanitizeUrl(url: string | undefined, fieldName: string): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL format for ${fieldName}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid URL scheme for ${fieldName}: only http and https are allowed`);
  }
  return trimmed;
}

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
    return ctx.db
      .query("sponsors")
      .withIndex("by_hackathonId_order", (q) =>
        q.eq("hackathonId", args.hackathonId)
      )
      .order("asc")
      .collect();
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
    badgeText: v.optional(v.string()),
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
    const maxOrder = existing.reduce((max, s) => Math.max(max, s.order ?? -1), -1);
    return ctx.db.insert("sponsors", {
      hackathonId: args.hackathonId,
      name: args.name.trim(),
      pfpUrl: sanitizeUrl(args.pfpUrl, "pfpUrl"),
      bannerUrl: sanitizeUrl(args.bannerUrl, "bannerUrl"),
      websiteUrl: sanitizeUrl(args.websiteUrl, "websiteUrl"),
      displayStyle: args.displayStyle ?? "medium",
      order: maxOrder + 1,
      badgeText: args.badgeText?.trim() || undefined,
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
    badgeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sponsor = await ctx.db.get(args.sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");
    const userId = await requireAuthUserId(ctx);
    await verifyOrganizer(ctx, sponsor.hackathonId, userId);
    await ctx.db.patch(args.sponsorId, {
      name: args.name.trim(),
      pfpUrl: sanitizeUrl(args.pfpUrl, "pfpUrl"),
      bannerUrl: sanitizeUrl(args.bannerUrl, "bannerUrl"),
      websiteUrl: sanitizeUrl(args.websiteUrl, "websiteUrl"),
      displayStyle: args.displayStyle ?? "medium",
      badgeText: args.badgeText?.trim() || undefined,
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

export const reorder = mutation({
  args: {
    hackathonId: v.id("hackathons"),
    sponsorIds: v.array(v.id("sponsors")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await verifyOrganizer(ctx, args.hackathonId, userId);
    await Promise.all(
      args.sponsorIds.map((id, index) => ctx.db.patch(id, { order: index }))
    );
  },
});
