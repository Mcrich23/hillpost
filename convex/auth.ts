import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Get the authenticated user's identity, throwing if not authenticated.
 * Use this when you need both userId and userName without redundant lookups.
 */
export async function requireAuthIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

/**
 * Get the authenticated user's ID from the Convex auth context.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  // identity.subject is the Clerk user ID
  return identity?.subject ?? null;
}

/**
 * Get the authenticated user's ID, throwing if not authenticated.
 * Use this in mutations that require authentication.
 */
export async function requireAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const identity = await requireAuthIdentity(ctx);
  return identity.subject;
}

/**
 * Get the authenticated user's display name from the auth context.
 * Requires authentication — throws if not authenticated.
 * Falls back to "Unknown" if the identity has no name or nickname.
 */
export async function getAuthUserName(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const identity = await requireAuthIdentity(ctx);
  return identity.name ?? identity.nickname ?? "Unknown";
}
