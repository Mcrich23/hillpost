/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as categories from "../categories.js";
import type * as hackathons from "../hackathons.js";
import type * as leaderboard from "../leaderboard.js";
import type * as members from "../members.js";
import type * as scores from "../scores.js";
import type * as submissions from "../submissions.js";
import type * as teams from "../teams.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myQueryFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  categories: typeof categories;
  hackathons: typeof hackathons;
  leaderboard: typeof leaderboard;
  members: typeof members;
  scores: typeof scores;
  submissions: typeof submissions;
  teams: typeof teams;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
