import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Get the authenticated user's ID from the Convex auth context.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  // identity.subject is the Clerk user ID
  return identity.subject;
}

/**
 * Get the authenticated user's ID, throwing if not authenticated.
 * Use this in mutations that require authentication.
 */
export async function requireAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

/**
 * Get the authenticated user's display name from the auth context.
 * Falls back to "Unknown" if no name is available.
 */
export async function getAuthUserName(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.name ?? identity.nickname ?? "Unknown";
}
