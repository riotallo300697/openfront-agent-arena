import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ArenaClient } from "../../../sdk/typescript/arenaClient";
import type { ArenaSessionMatchArtifact } from "../../../server/src/arenaSessionMatchArtifact";
import { openFrontArenaRulesText } from "./rules";

export type OpenFrontArenaMcpServerOptions = {
  arenaApiBaseUrl?: string;
};

const localhostNames = new Set(["127.0.0.1", "localhost", "::1"]);

function arenaApiBaseUrlFromOptions({
  arenaApiBaseUrl = process.env.ARENA_API_URL ?? "http://127.0.0.1:5000",
}: OpenFrontArenaMcpServerOptions): string {
  const url = new URL(arenaApiBaseUrl);

  if (url.protocol !== "http:" || !localhostNames.has(url.hostname)) {
    throw new Error("ARENA_API_URL must be a localhost http URL");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function jsonText(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function sessionArtifactMetadata(artifact: ArenaSessionMatchArtifact) {
  return {
    agentDecisionTimeoutMs: artifact.agentDecisionTimeoutMs,
    agents: artifact.agents.map((agent) => ({
      clientID: agent.clientID,
      decisions: agent.decisions,
      finalObservation: agent.finalObservation,
      name: agent.name,
      slotIndex: agent.slotIndex,
    })),
    completedAt: artifact.completedAt,
    createdAt: artifact.createdAt,
    decisions: artifact.decisions,
    format: artifact.format,
    map: artifact.map,
    matchID: artifact.matchID,
    maxTicks: artifact.maxTicks,
    replay: artifact.replay,
    result: {
      decisions: artifact.result.decisions,
      replay: artifact.result.replay,
      ticks: artifact.result.ticks,
      updates: artifact.result.updates,
    },
    runner: artifact.runner,
    sessionID: artifact.sessionID,
    status: artifact.status,
    turnCount: artifact.turns.length,
    version: artifact.version,
  };
}

export function createOpenFrontArenaMcpServer(
  options: OpenFrontArenaMcpServerOptions = {},
): McpServer {
  const arenaApiBaseUrl = arenaApiBaseUrlFromOptions(options);
  const arenaClient = new ArenaClient({
    baseUrl: arenaApiBaseUrl,
  });
  const server = new McpServer({
    name: "openfront-agent-arena-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "openfront_get_rules",
    {
      title: "Get Agent Arena Rules",
      description:
        "Return the current local OpenFront Agent Arena rules summary.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [
        {
          type: "text",
          text: openFrontArenaRulesText,
        },
      ],
    }),
  );

  server.registerResource(
    "openfront_rules",
    "openfront://rules",
    {
      title: "OpenFront Agent Arena Rules",
      description:
        "Concise embedded rules summary for the local Agent Arena MVP.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "text/plain",
          text: openFrontArenaRulesText,
        },
      ],
    }),
  );

  server.registerTool(
    "openfront_list_matches",
    {
      title: "List Arena Matches",
      description:
        "List completed in-memory match records from the configured local Arena API server.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => jsonText(await arenaClient.listMatches()),
  );

  server.registerTool(
    "openfront_get_match_status",
    {
      title: "Get Arena Match Status",
      description:
        "Read status and timestamps for one completed local Arena match.",
      inputSchema: {
        matchID: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ matchID }) => {
      const match = await arenaClient.getMatch(matchID);
      return jsonText({
        matchID: match.matchID,
        status: match.status,
        createdAt: match.createdAt,
        completedAt: match.completedAt,
      });
    },
  );

  server.registerTool(
    "openfront_get_result",
    {
      title: "Get Arena Match Result",
      description: "Read the final result for one completed local Arena match.",
      inputSchema: {
        matchID: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ matchID }) => jsonText(await arenaClient.getResult(matchID)),
  );

  server.registerTool(
    "openfront_get_replay_metadata",
    {
      title: "Get Arena Replay Metadata",
      description:
        "Read replay metadata and path for one completed local Arena match without reading the replay file.",
      inputSchema: {
        matchID: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ matchID }) => jsonText(await arenaClient.getReplay(matchID)),
  );

  server.registerTool(
    "openfront_list_session_artifacts",
    {
      title: "List Arena Session Artifacts",
      description:
        "List completed session artifact metadata from the configured local Arena API server.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const artifacts = await arenaClient.listSessionArtifacts();
      return jsonText({
        artifacts: artifacts.artifacts.map(sessionArtifactMetadata),
      });
    },
  );

  server.registerTool(
    "openfront_get_session_artifact_metadata",
    {
      title: "Get Arena Session Artifact Metadata",
      description:
        "Read completed session artifact metadata by session ID without reading replay contents or exposing MCP action tools.",
      inputSchema: {
        sessionID: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ sessionID }) =>
      jsonText(sessionArtifactMetadata(await arenaClient.getSessionArtifact(sessionID))),
  );

  return server;
}

export async function runOpenFrontArenaMcpStdioServer(): Promise<void> {
  const server = createOpenFrontArenaMcpServer();
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runOpenFrontArenaMcpStdioServer();
}
