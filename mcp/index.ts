/**
 * Hillpost MCP Server
 *
 * Exposes hackathon management tools for organizers, judges, and competitors
 * via the Model Context Protocol.
 *
 * Auth: users configure a HILLPOST_TOKEN generated from hillpost.dev.
 * Transport: Streamable HTTP (default, port 3001) or stdio (--stdio flag).
 *
 * Run:
 *   npx tsx mcp/index.ts            # HTTP server on :3001
 *   npx tsx mcp/index.ts --stdio    # stdio (Claude Desktop / Claude Code)
 */

import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, ".env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { z } from "zod";
import http from "node:http";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONVEX_URL = process.env.CONVEX_URL;
const HILLPOST_TOKEN = process.env.HILLPOST_TOKEN;
const PORT = Number(process.env.MCP_PORT ?? 3001);
const USE_STDIO = process.argv.includes("--stdio");

if (!CONVEX_URL) {
  console.error("Missing CONVEX_URL environment variable.");
  process.exit(1);
}
if (!HILLPOST_TOKEN && !USE_STDIO) {
  // In HTTP mode, the token is passed per tool call so it's optional at startup.
  // In stdio mode, we require it upfront.
}

const client = new ConvexHttpClient(CONVEX_URL);

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "hillpost",
  version: "1.0.0",
}, {
  instructions: `Hillpost MCP Server — manage hackathons on hillpost.dev.

Every tool requires a "token" argument (your personal Hillpost MCP token).
Generate one at hillpost.dev → Dashboard → MCP section.

Roles:
- organizer: full control over a hackathon (categories, members, sponsors, settings)
- judge: score submissions for a hackathon
- competitor/hacker: create teams, submit projects

Access is scoped to hackathons you are a member of. Start by calling whoami to see your identity and roles, then use get_hackathon with a specific hackathonId to view details.`,
});

// ---------------------------------------------------------------------------
// Helper: token from env or tool arg
// ---------------------------------------------------------------------------

function resolveToken(toolToken?: string): string {
  const token = toolToken ?? HILLPOST_TOKEN;
  if (!token) {
    throw new Error(
      "No token provided. Either set HILLPOST_TOKEN in your environment, or pass a token argument to this tool."
    );
  }
  return token;
}

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true as const };
}

function json(data: unknown) {
  return ok(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Identity tools
// ---------------------------------------------------------------------------

server.registerTool(
  "whoami",
  {
    title: "Who Am I",
    description: "Returns your identity and roles across all hackathons you belong to.",
    inputSchema: z.object({
      token: z.string().optional().describe("Hillpost MCP token (falls back to HILLPOST_TOKEN env var)"),
    }),
  },
  async ({ token }) => {
    try {
      const result = await client.query(api.mcpFunctions.whoami, { token: resolveToken(token) });
      return ok(result.summary + "\n\n" + JSON.stringify(result.hackathons, null, 2));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Hackathon tools
// ---------------------------------------------------------------------------

server.registerTool(
  "get_hackathon",
  {
    title: "Get Hackathon",
    description: "Get details for a specific hackathon including your join codes if you are an organizer.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string().describe("The Convex ID of the hackathon"),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.getHackathon, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      return json(result);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "create_hackathon",
  {
    title: "Create Hackathon",
    description: "Create a new hackathon. You automatically become its organizer.",
    inputSchema: z.object({
      token: z.string().optional(),
      name: z.string().describe("Hackathon name"),
      description: z.string().describe("What this hackathon is about"),
      startDate: z.number().describe("Start timestamp in milliseconds (Unix ms)"),
      endDate: z.number().describe("End timestamp in milliseconds (Unix ms)"),
      submissionFrequencyMinutes: z.number().optional().describe("Minimum minutes between resubmissions (default 60)"),
    }),
  },
  async ({ token, ...args }) => {
    try {
      const result = await client.mutation(api.mcpFunctions.createHackathon, {
        token: resolveToken(token),
        ...args,
      });
      return ok(
        `Hackathon created!\n` +
        `ID: ${result.hackathonId}\n` +
        `Competitor join code: ${result.competitorJoinCode}\n` +
        `Judge join code: ${result.judgeJoinCode}`
      );
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "update_hackathon",
  {
    title: "Update Hackathon",
    description: "Update hackathon settings. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      startDate: z.number().optional().describe("Unix ms"),
      endDate: z.number().optional().describe("Unix ms"),
      submissionFrequencyMinutes: z.number().optional(),
      isActive: z.boolean().optional(),
    }),
  },
  async ({ token, hackathonId, ...patch }) => {
    try {
      await client.mutation(api.mcpFunctions.updateHackathon, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
        ...patch,
      });
      return ok("Hackathon updated.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Member management tools (organizer)
// ---------------------------------------------------------------------------

server.registerTool(
  "list_members",
  {
    title: "List Members",
    description: "List all members of a hackathon. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.listMembers, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      return json(result);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "approve_member",
  {
    title: "Approve Member",
    description: "Approve a pending member (typically a judge waiting for approval). Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      memberId: z.string().describe("The hackathonMembers document ID"),
    }),
  },
  async ({ token, memberId }) => {
    try {
      await client.mutation(api.mcpFunctions.approveMember, {
        token: resolveToken(token),
        memberId: memberId as any,
      });
      return ok("Member approved.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "reject_member",
  {
    title: "Reject Member",
    description: "Reject a pending member. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      memberId: z.string(),
    }),
  },
  async ({ token, memberId }) => {
    try {
      await client.mutation(api.mcpFunctions.rejectMember, {
        token: resolveToken(token),
        memberId: memberId as any,
      });
      return ok("Member rejected.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "remove_member",
  {
    title: "Remove Member",
    description: "Remove a member from a hackathon. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      memberId: z.string(),
    }),
    annotations: { destructiveHint: true },
  },
  async ({ token, memberId }) => {
    try {
      await client.mutation(api.mcpFunctions.removeMember, {
        token: resolveToken(token),
        memberId: memberId as any,
      });
      return ok("Member removed.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Category tools (organizer)
// ---------------------------------------------------------------------------

server.registerTool(
  "list_categories",
  {
    title: "List Categories",
    description: "List scoring categories for a hackathon.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.listCategories, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      return json(result);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "create_category",
  {
    title: "Create Category",
    description: "Create a scoring category for a hackathon. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
      name: z.string(),
      description: z.string(),
      maxScore: z.number().describe("Maximum score for this category"),
    }),
  },
  async ({ token, hackathonId, ...args }) => {
    try {
      const id = await client.mutation(api.mcpFunctions.createCategory, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
        ...args,
      });
      return ok(`Category created: ${id}`);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "update_category",
  {
    title: "Update Category",
    description: "Update a scoring category. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      categoryId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      maxScore: z.number().optional(),
    }),
  },
  async ({ token, categoryId, ...patch }) => {
    try {
      await client.mutation(api.mcpFunctions.updateCategory, {
        token: resolveToken(token),
        categoryId: categoryId as any,
        ...patch,
      });
      return ok("Category updated.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "delete_category",
  {
    title: "Delete Category",
    description: "Delete a scoring category. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      categoryId: z.string(),
    }),
    annotations: { destructiveHint: true },
  },
  async ({ token, categoryId }) => {
    try {
      await client.mutation(api.mcpFunctions.deleteCategory, {
        token: resolveToken(token),
        categoryId: categoryId as any,
      });
      return ok("Category deleted.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Sponsor tools (organizer)
// ---------------------------------------------------------------------------

server.registerTool(
  "list_sponsors",
  {
    title: "List Sponsors",
    description: "List sponsors for a hackathon.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.listSponsors, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      return json(result);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "create_sponsor",
  {
    title: "Create Sponsor",
    description: "Add a sponsor to a hackathon. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
      name: z.string(),
      websiteUrl: z.string().optional(),
      displayStyle: z.enum(["featured", "large", "medium", "small"]).optional(),
      badgeText: z.string().optional(),
    }),
  },
  async ({ token, hackathonId, ...args }) => {
    try {
      const id = await client.mutation(api.mcpFunctions.createSponsor, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
        ...args,
      });
      return ok(`Sponsor created: ${id}`);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "update_sponsor",
  {
    title: "Update Sponsor",
    description: "Update a sponsor. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      sponsorId: z.string(),
      name: z.string().optional(),
      websiteUrl: z.string().optional(),
      displayStyle: z.enum(["featured", "large", "medium", "small"]).optional(),
      badgeText: z.string().optional(),
    }),
  },
  async ({ token, sponsorId, ...patch }) => {
    try {
      await client.mutation(api.mcpFunctions.updateSponsor, {
        token: resolveToken(token),
        sponsorId: sponsorId as any,
        ...patch,
      });
      return ok("Sponsor updated.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "delete_sponsor",
  {
    title: "Delete Sponsor",
    description: "Remove a sponsor from a hackathon. Requires organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      sponsorId: z.string(),
    }),
    annotations: { destructiveHint: true },
  },
  async ({ token, sponsorId }) => {
    try {
      await client.mutation(api.mcpFunctions.deleteSponsor, {
        token: resolveToken(token),
        sponsorId: sponsorId as any,
      });
      return ok("Sponsor deleted.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Join hackathon
// ---------------------------------------------------------------------------

server.registerTool(
  "join_hackathon",
  {
    title: "Join Hackathon",
    description: "Join a hackathon using a join code. Competitor codes grant immediate access; judge codes are pending approval.",
    inputSchema: z.object({
      token: z.string().optional(),
      joinCode: z.string().describe("6-character join code from the organizer"),
    }),
  },
  async ({ token, joinCode }) => {
    try {
      const result = await client.mutation(api.mcpFunctions.joinHackathon, {
        token: resolveToken(token),
        joinCode,
      });
      if (result.alreadyMember) {
        return ok(`You are already a ${result.role} in this hackathon.`);
      }
      const statusMsg = result.role === "judge"
        ? " Your judge status is pending organizer approval."
        : "";
      return ok(`Joined hackathon as ${result.role}!${statusMsg} Hackathon ID: ${result.hackathonId}`);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Team tools (competitor)
// ---------------------------------------------------------------------------

server.registerTool(
  "list_teams",
  {
    title: "List Teams",
    description: "List all teams in a hackathon.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.listTeams, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      return json(result);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "create_team",
  {
    title: "Create Team",
    description: "Create a new team in a hackathon. You automatically join it. Requires competitor role.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
      name: z.string().describe("Team name"),
    }),
  },
  async ({ token, hackathonId, name }) => {
    try {
      const teamId = await client.mutation(api.mcpFunctions.createTeam, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
        name,
      });
      return ok(`Team created! Team ID: ${teamId}`);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "join_team",
  {
    title: "Join Team",
    description: "Join an existing team. Requires competitor role and no existing team.",
    inputSchema: z.object({
      token: z.string().optional(),
      teamId: z.string(),
    }),
  },
  async ({ token, teamId }) => {
    try {
      await client.mutation(api.mcpFunctions.joinTeam, {
        token: resolveToken(token),
        teamId: teamId as any,
      });
      return ok("Joined team.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "leave_team",
  {
    title: "Leave Team",
    description: "Leave your current team. Requires competitor role.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      await client.mutation(api.mcpFunctions.leaveTeam, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      return ok("Left team.");
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Submission tools (competitor)
// ---------------------------------------------------------------------------

server.registerTool(
  "submit_project",
  {
    title: "Submit Project",
    description: "Submit or resubmit your team's project. Requires competitor role and an existing team.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
      name: z.string().describe("Project name"),
      description: z.string().describe("Project description"),
      projectUrl: z.string().describe("GitHub or source code URL"),
      demoUrl: z.string().optional().describe("Video demo URL"),
      deployedUrl: z.string().optional().describe("Live deployment URL"),
      whatsNew: z.string().optional().describe("What changed in this resubmission"),
    }),
  },
  async ({ token, hackathonId, ...args }) => {
    try {
      const id = await client.mutation(api.mcpFunctions.submitProject, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
        ...args,
      });
      return ok(`Project submitted! Submission ID: ${id}`);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "get_my_submission",
  {
    title: "Get My Submission",
    description: "View your team's current submission for a hackathon.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.getMySubmission, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      if (!result) return ok("No submission found for your team yet.");
      return json(result);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Judge tools
// ---------------------------------------------------------------------------

server.registerTool(
  "list_submissions_to_judge",
  {
    title: "List Submissions to Judge",
    description: "List all submissions in a hackathon for judging. Requires judge or organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.listSubmissionsToJudge, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      return json(result);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "score_submission",
  {
    title: "Score Submission",
    description: "Score a submission in a specific category. Requires judge or organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      submissionId: z.string(),
      categoryId: z.string(),
      score: z.number().describe("Score value (must be within the category's maxScore)"),
      feedback: z.string().optional().describe("Written feedback for the team"),
    }),
  },
  async ({ token, submissionId, categoryId, score, feedback }) => {
    try {
      const id = await client.mutation(api.mcpFunctions.scoreSubmission, {
        token: resolveToken(token),
        submissionId: submissionId as any,
        categoryId: categoryId as any,
        score,
        feedback,
      });
      return ok(`Score submitted! Score ID: ${id}`);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

server.registerTool(
  "get_my_scores",
  {
    title: "Get My Scores",
    description: "View all scores you have given in a hackathon. Requires judge or organizer role.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.getMyScores, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      return json(result);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

server.registerTool(
  "get_leaderboard",
  {
    title: "Get Leaderboard",
    description: "View the current leaderboard for a hackathon.",
    inputSchema: z.object({
      token: z.string().optional(),
      hackathonId: z.string(),
    }),
  },
  async ({ token, hackathonId }) => {
    try {
      const result = await client.query(api.mcpFunctions.getLeaderboard, {
        token: resolveToken(token),
        hackathonId: hackathonId as any,
      });
      const lines = result.entries.map(e =>
        `#${e.rank} ${e.teamName}: ${e.overallScore.toFixed(2)} / ${result.maxPossibleScore}`
      );
      return ok(lines.join("\n") + "\n\n" + JSON.stringify(result.entries, null, 2));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  }
);

// ---------------------------------------------------------------------------
// Transport setup
// ---------------------------------------------------------------------------

async function startStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttp() {
  // Map of sessionId -> transport for stateful sessions
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found. Use POST /mcp");
      return;
    }

    // Reuse or create a session transport
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId)!;
    } else {
      const newSessionId = randomUUID();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: (id) => {
          sessions.set(id, transport);
        },
      });

      transport.onclose = () => {
        sessions.delete(newSessionId);
      };

      await server.connect(transport);
    }

    await transport.handleRequest(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(`Hillpost MCP server running at http://localhost:${PORT}/mcp`);
  });

  process.on("SIGINT", async () => {
    for (const [id, t] of sessions) {
      await t.close();
      sessions.delete(id);
    }
    httpServer.close();
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (USE_STDIO) {
  startStdio().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  startHttp().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
