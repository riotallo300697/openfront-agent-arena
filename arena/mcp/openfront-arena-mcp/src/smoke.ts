import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { startHttpExampleAgentPair } from "../../../agents/httpExampleAgentLauncher";
import { expectCondition, expectJsonEqual } from "../../../runner/src/smokeAssert";
import { startArenaApiServer } from "../../../server/src/arenaApiServer";
import type { ArenaSessionCompletionSummary } from "../../../server/src/arenaSessionCompletion";
import { buildArenaSessionMatchArtifact } from "../../../server/src/arenaSessionMatchArtifact";
import { ArenaClient } from "../../../sdk/typescript/arenaClient";
import { createOpenFrontArenaMcpServer } from "./server";

const sessionCompletion: ArenaSessionCompletionSummary = {
  agentDecisionTimeoutMs: 1000,
  agents: [
    {
      clientID: "mcp-session-agent-a",
      decisions: {
        expired: 0,
        missing: 0,
        pending: 0,
        rejected: 0,
        submitted: 1,
        total: 1,
      },
      finalObservation: {
        hasSpawned: true,
        isAlive: true,
        tick: 1,
        tilesOwned: 12,
      },
      name: "MCP Session Agent A",
      slotIndex: 0,
    },
    {
      clientID: "mcp-session-agent-b",
      decisions: {
        expired: 0,
        missing: 0,
        pending: 0,
        rejected: 0,
        submitted: 1,
        total: 1,
      },
      finalObservation: {
        hasSpawned: true,
        isAlive: true,
        tick: 1,
        tilesOwned: 10,
      },
      name: "MCP Session Agent B",
      slotIndex: 1,
    },
  ],
  completedAt: "2999-05-18T00:00:01.000Z",
  createdAt: "2999-05-18T00:00:00.000Z",
  currentTick: 1,
  decisions: {
    expired: 0,
    missing: 0,
    pending: 0,
    rejected: 0,
    submitted: 2,
    total: 2,
  },
  map: "tests/testdata/maps/plains",
  matchID: "arena-mcp-session-artifact-match",
  maxTicks: 1,
  replay: null,
  runner: "api-session",
  sessionID: "arena-mcp-session-artifact",
  status: "completed",
  ticks: 1,
  turns: [
    {
      tick: 1,
      decisions: [
        {
          action: {
            type: "wait",
          },
          clientID: "mcp-session-agent-a",
          state: "submitted",
          turnID: "turn-1-mcp-session-agent-a",
        },
        {
          action: {
            type: "wait",
          },
          clientID: "mcp-session-agent-b",
          state: "submitted",
          turnID: "turn-1-mcp-session-agent-b",
        },
      ],
    },
  ],
};
const sessionArtifact = buildArenaSessionMatchArtifact(sessionCompletion);
const arenaApiServer = await startArenaApiServer({
  sessionMatchArtifacts: new Map([[sessionArtifact.sessionID, sessionArtifact]]),
});
const agentPair = await startHttpExampleAgentPair({
  agentAPort: 0,
  agentBPort: 0,
});
const arenaClient = new ArenaClient({
  baseUrl: arenaApiServer.url,
});
const matchID = "arena-mcp-readonly-smoke";
const server = createOpenFrontArenaMcpServer({
  arenaApiBaseUrl: arenaApiServer.url,
});
const client = new Client({
  name: "openfront-agent-arena-mcp-smoke",
  version: "0.1.0",
});
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

function parseToolJson(result: Awaited<ReturnType<Client["callTool"]>>): unknown {
  const firstContent = result.content[0];
  expectCondition(
    "mcp json tool content",
    firstContent?.type === "text" && firstContent.text.length > 0,
    { result },
  );

  return firstContent?.type === "text" ? JSON.parse(firstContent.text) : null;
}

function expectToolError(
  name: string,
  result: Awaited<ReturnType<Client["callTool"]>>,
  expectedText: string,
): void {
  const firstContent = result.content[0];
  expectCondition(
    name,
    result.isError === true &&
      firstContent?.type === "text" &&
      firstContent.text.includes(expectedText),
    { result },
  );
}

function expectInvalidArenaApiUrl(name: string, arenaApiBaseUrl: string): void {
  let error: unknown = null;

  try {
    createOpenFrontArenaMcpServer({
      arenaApiBaseUrl,
    });
  } catch (caught) {
    error = caught;
  }

  expectCondition(
    name,
    error instanceof Error &&
      error.message.includes("ARENA_API_URL must be a localhost http URL"),
    {
      arenaApiBaseUrl,
      error: error instanceof Error ? error.message : error,
    },
  );
}

try {
  expectInvalidArenaApiUrl(
    "mcp rejects https Arena API URL",
    "https://127.0.0.1:5000",
  );
  expectInvalidArenaApiUrl(
    "mcp rejects non-localhost Arena API URL",
    "http://example.com:5000",
  );

  await arenaClient.createMatch({
    matchID,
    map: "tests/testdata/maps/plains",
    maxTicks: 3,
    agentDecisionTimeoutMs: 1000,
    agents: agentPair.agents.map((agent) => ({
      clientID: agent.clientID,
      name: agent.name,
      endpoint: agent.endpoint,
      spawn: agent.spawn,
    })),
  });

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  const tools = await client.listTools();
  expectJsonEqual(
    "mcp tools",
    tools.tools.map((tool) => tool.name),
    [
      "openfront_get_rules",
      "openfront_list_matches",
      "openfront_get_match_status",
      "openfront_get_result",
      "openfront_get_replay_metadata",
      "openfront_list_session_artifacts",
      "openfront_get_session_artifact_metadata",
    ],
  );
  expectCondition(
    "mcp tools are read only",
    tools.tools.every(
      (tool) =>
        tool.annotations?.readOnlyHint === true &&
        tool.annotations.destructiveHint === false &&
        tool.annotations.openWorldHint === false,
    ),
    { tools },
  );

  const rules = await client.callTool({
    name: "openfront_get_rules",
  });
  const firstContent = rules.content[0];
  expectCondition(
    "mcp get rules content",
    firstContent?.type === "text" &&
      firstContent.text.includes("OpenFront Agent Arena rules summary") &&
      firstContent.text.includes("does not need filesystem access"),
    { rules },
  );

  const listedMatches = parseToolJson(
    await client.callTool({
      name: "openfront_list_matches",
    }),
  ) as {
    matches?: {
      matchID?: unknown;
    }[];
  };
  expectJsonEqual(
    "mcp list matches",
    Array.isArray(listedMatches.matches)
      ? listedMatches.matches.map((match) => match.matchID)
      : [],
    [matchID],
  );

  const status = parseToolJson(
    await client.callTool({
      name: "openfront_get_match_status",
      arguments: {
        matchID,
      },
    }),
  ) as {
    matchID?: unknown;
    status?: unknown;
    createdAt?: unknown;
    completedAt?: unknown;
  };
  expectJsonEqual("mcp match status id", status.matchID, matchID);
  expectJsonEqual("mcp match status", status.status, "completed");
  expectCondition(
    "mcp match status timestamps",
    typeof status.createdAt === "string" && typeof status.completedAt === "string",
    { status },
  );

  const result = parseToolJson(
    await client.callTool({
      name: "openfront_get_result",
      arguments: {
        matchID,
      },
    }),
  ) as {
    matchID?: unknown;
    ticks?: unknown;
    rejectedActions?: unknown;
  };
  expectJsonEqual("mcp result id", result.matchID, matchID);
  expectJsonEqual("mcp result ticks", result.ticks, 3);
  expectJsonEqual("mcp result rejected actions", result.rejectedActions, 0);

  const replayMetadata = parseToolJson(
    await client.callTool({
      name: "openfront_get_replay_metadata",
      arguments: {
        matchID,
      },
    }),
  ) as {
    matchID?: unknown;
    format?: unknown;
    path?: unknown;
  };
  expectJsonEqual("mcp replay metadata id", replayMetadata.matchID, matchID);
  expectJsonEqual(
    "mcp replay metadata format",
    replayMetadata.format,
    "openfront-agent-arena-jsonl",
  );
  expectCondition(
    "mcp replay metadata path",
    typeof replayMetadata.path === "string" &&
      replayMetadata.path.length > 0,
    { replayMetadata },
  );

  const listedSessionArtifacts = parseToolJson(
    await client.callTool({
      name: "openfront_list_session_artifacts",
    }),
  ) as {
    artifacts?: {
      matchID?: unknown;
      sessionID?: unknown;
      turnCount?: unknown;
    }[];
  };
  expectJsonEqual(
    "mcp list session artifacts",
    Array.isArray(listedSessionArtifacts.artifacts)
      ? listedSessionArtifacts.artifacts.map((artifact) => artifact.sessionID)
      : [],
    [sessionArtifact.sessionID],
  );
  expectJsonEqual(
    "mcp list session artifact match id",
    listedSessionArtifacts.artifacts?.[0]?.matchID,
    sessionArtifact.matchID,
  );
  expectJsonEqual(
    "mcp list session artifact turn count",
    listedSessionArtifacts.artifacts?.[0]?.turnCount,
    1,
  );

  const sessionArtifactMetadata = parseToolJson(
    await client.callTool({
      name: "openfront_get_session_artifact_metadata",
      arguments: {
        sessionID: sessionArtifact.sessionID,
      },
    }),
  ) as {
    replay?: unknown;
    sessionID?: unknown;
    status?: unknown;
    turnCount?: unknown;
    turns?: unknown;
  };
  expectJsonEqual(
    "mcp session artifact metadata id",
    sessionArtifactMetadata.sessionID,
    sessionArtifact.sessionID,
  );
  expectJsonEqual(
    "mcp session artifact metadata status",
    sessionArtifactMetadata.status,
    "completed",
  );
  expectJsonEqual(
    "mcp session artifact metadata replay",
    sessionArtifactMetadata.replay,
    {
      format: "openfront-agent-arena-jsonl",
      path: null,
    },
  );
  expectJsonEqual(
    "mcp session artifact metadata turn count",
    sessionArtifactMetadata.turnCount,
    1,
  );
  expectCondition(
    "mcp session artifact metadata excludes turns",
    !("turns" in sessionArtifactMetadata),
    { sessionArtifactMetadata },
  );

  expectToolError(
    "mcp missing match status error",
    await client.callTool({
      name: "openfront_get_match_status",
      arguments: {
        matchID: "missing-mcp-match",
      },
    }),
    "match_not_found",
  );
  expectToolError(
    "mcp missing replay metadata error",
    await client.callTool({
      name: "openfront_get_replay_metadata",
      arguments: {
        matchID: "missing-mcp-match",
      },
    }),
    "match_not_found",
  );
  expectToolError(
    "mcp missing session artifact error",
    await client.callTool({
      name: "openfront_get_session_artifact_metadata",
      arguments: {
        sessionID: "missing-mcp-session-artifact",
      },
    }),
    "session_artifact_not_found",
  );

  const resources = await client.listResources();
  expectJsonEqual(
    "mcp resources",
    resources.resources.map((resource) => resource.uri),
    ["openfront://rules"],
  );

  const resource = await client.readResource({
    uri: "openfront://rules",
  });
  const firstResource = resource.contents[0];
  expectCondition(
    "mcp rules resource",
    firstResource?.uri === "openfront://rules" &&
      "text" in firstResource &&
      typeof firstResource.text === "string" &&
      firstResource.text.includes("OpenFront Agent Arena rules summary"),
    { resource },
  );

  console.log("OpenFront Agent Arena MCP smoke check passed.");
  console.log(
    JSON.stringify(
      {
        tools: tools.tools.map((tool) => tool.name),
        resources: resources.resources.map((item) => item.uri),
        matchID,
        sessionArtifactID: sessionArtifact.sessionID,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
  await server.close();
  await agentPair.close();
  await arenaApiServer.close();
}
