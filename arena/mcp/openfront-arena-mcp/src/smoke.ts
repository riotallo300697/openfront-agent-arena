import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { startHttpExampleAgentPair } from "../../../agents/httpExampleAgentLauncher";
import { expectCondition, expectJsonEqual } from "../../../runner/src/smokeAssert";
import { startArenaApiServer } from "../../../server/src/arenaApiServer";
import { ArenaClient } from "../../../sdk/typescript/arenaClient";
import { createOpenFrontArenaMcpServer } from "./server";

const arenaApiServer = await startArenaApiServer();
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

try {
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
