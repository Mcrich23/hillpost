import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Retrieves the authenticated user's ID (Clerk subject) from the Convex auth context.
 * Returns null if the user is not authenticated.
 */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return identity.subject;
}

/**
 * Retrieves the authenticated user's ID from the Convex auth context.
 * Throws an error if the user is not authenticated.
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
 * Retrieves the authenticated user's display name from the Convex auth context.
 * Returns a fallback string if the name is not available.
 */
export async function getAuthUserName(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return "Unknown";
  return identity.name ?? "Unknown";
}
