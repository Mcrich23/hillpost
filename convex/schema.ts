import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  hackathons: defineTable({
    name: v.string(),
    description: v.string(),
    organizerId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    submissionFrequencyMinutes: v.number(),
    isActive: v.boolean(),
    competitorJoinCode: v.string(),
    judgeJoinCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_competitorJoinCode", ["competitorJoinCode"])
    .index("by_judgeJoinCode", ["judgeJoinCode"])
    .index("by_organizerId", ["organizerId"]),

  hackathonMembers: defineTable({
    hackathonId: v.id("hackathons"),
    userId: v.string(),
    userName: v.string(),
    userImageUrl: v.optional(v.string()),
    role: v.union(
      v.literal("organizer"),
      v.literal("judge"),
      v.literal("competitor")
    ),
    teamId: v.optional(v.id("teams")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    joinedAt: v.number(),
  })
    .index("by_hackathonId", ["hackathonId"])
    .index("by_userId", ["userId"])
    .index("by_hackathonId_userId", ["hackathonId", "userId"])
    .index("by_hackathonId_role", ["hackathonId", "role"])
    .index("by_teamId", ["teamId"]),

  teams: defineTable({
    hackathonId: v.id("hackathons"),
    name: v.string(),
    createdAt: v.number(),
  })
    .index("by_hackathonId", ["hackathonId"]),

  categories: defineTable({
    hackathonId: v.id("hackathons"),
    name: v.string(),
    description: v.string(),
    maxScore: v.number(),
    order: v.number(),
  })
    .index("by_hackathonId", ["hackathonId"]),

  submissions: defineTable({
    hackathonId: v.id("hackathons"),
    teamId: v.id("teams"),
    name: v.string(),
    description: v.string(),
    projectUrl: v.string(),
    demoUrl: v.optional(v.string()),
    deployedUrl: v.optional(v.string()),
    whatsNew: v.optional(v.string()),
    changelog: v.optional(v.array(v.object({
      submissionCount: v.number(),
      whatsNew: v.optional(v.string()),
      submittedAt: v.number(),
    }))),
    submittedAt: v.number(),
    submittedBy: v.string(),
    submissionCount: v.number(),
    judgedBy: v.array(v.string()), // Array of judge UIDs who have scored this iteration
    baselineScore: v.optional(v.number()),
    baselineJudgeCount: v.optional(v.number()),
  })
    .index("by_hackathonId", ["hackathonId"])
    .index("by_teamId", ["teamId"])
    .index("by_hackathonId_teamId", ["hackathonId", "teamId"]),

  scores: defineTable({
    submissionId: v.id("submissions"),
    categoryId: v.id("categories"),
    judgeId: v.string(),
    score: v.number(),
    feedback: v.optional(v.string()),
    scoredAt: v.number(),
  })
    .index("by_submissionId", ["submissionId"])
    .index("by_submissionId_categoryId_judgeId", [
      "submissionId",
      "categoryId",
      "judgeId",
    ])
    .index("by_judgeId", ["judgeId"]),
});
