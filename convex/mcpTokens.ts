import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, getAuthUserName } from "./auth";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "hpmc_";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const generate = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);
    const userName = await getAuthUserName(ctx);

    // Revoke any existing tokens for this user first
    const existing = await ctx.db
      .query("mcpTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(existing.map((t) => ctx.db.delete(t._id)));

    let token = generateToken();
    // Ensure uniqueness
    while (
      await ctx.db
        .query("mcpTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first()
    ) {
      token = generateToken();
    }

    const id = await ctx.db.insert("mcpTokens", {
      userId,
      userName,
      token,
      createdAt: Date.now(),
    });

    return { id, token };
  },
});

export const revoke = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const tokens = await ctx.db
      .query("mcpTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    await Promise.all(tokens.map((t) => ctx.db.delete(t._id)));
    return { revoked: tokens.length };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const tokens = await ctx.db
      .query("mcpTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Mask the token — only show prefix
    return tokens.map((t) => ({
      _id: t._id,
      createdAt: t.createdAt,
      tokenPreview: t.token.slice(0, 10) + "...",
    }));
  },
});
