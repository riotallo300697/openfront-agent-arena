import { startHttpExampleAgentPair } from "../../agents/httpExampleAgentLauncher";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import { startArenaApiServer } from "../../server/src/arenaApiServer";
import { ArenaClient, ArenaClientHttpError } from "./arenaClient";

const server = await startArenaApiServer();
const agentPair = await startHttpExampleAgentPair({
  agentAPort: 0,
  agentBPort: 0,
});
const client = new ArenaClient({
  baseUrl: server.url,
});
const matchID = "arena-sdk-typescript-smoke";
const matchRequest = {
  matchID,
  map: "tests/testdata/maps/plains" as const,
  maxTicks: 3,
  agentDecisionTimeoutMs: 1000,
  agents: agentPair.agents.map((agent) => ({
    clientID: agent.clientID,
    name: agent.name,
    endpoint: agent.endpoint,
    spawn: agent.spawn,
  })),
};

try {
  const health = await client.health();
  expectJsonEqual("typescript sdk health", health, {
    ok: true,
    service: "openfront-agent-arena",
    mode: "local",
  });

  const collector = await client.createEventCollector({
    matchID,
  });
  const createdMatch = await client.createMatch(matchRequest);
  const events = await collector.waitForMatchEnded();
  await collector.close();

  expectJsonEqual("typescript sdk created match id", createdMatch.matchID, matchID);
  expectJsonEqual("typescript sdk created match status", createdMatch.status, "completed");
  expectJsonEqual(
    "typescript sdk created match ticks",
    createdMatch.result.ticks,
    matchRequest.maxTicks,
  );
  expectJsonEqual(
    "typescript sdk created match rejected actions",
    createdMatch.result.rejectedActions,
    0,
  );
  expectJsonEqual("typescript sdk replay metadata", createdMatch.replay, {
    format: "openfront-agent-arena-jsonl",
    path: createdMatch.result.replay,
  });

  const listedMatches = await client.listMatches();
  expectJsonEqual(
    "typescript sdk listed match ids",
    listedMatches.matches.map((match) => match.matchID),
    [matchID],
  );

  const readMatch = await client.getMatch(matchID);
  expectJsonEqual("typescript sdk read match", readMatch, createdMatch);

  const result = await client.getResult(matchID);
  expectJsonEqual("typescript sdk result", result, createdMatch.result);

  const replay = await client.getReplay(matchID);
  expectJsonEqual("typescript sdk replay", replay, {
    matchID,
    format: "openfront-agent-arena-jsonl",
    path: createdMatch.result.replay,
  });

  expectJsonEqual(
    "typescript sdk event types",
    events.map((event) => event.type),
    [
      "match.started",
      "action.accepted",
      "action.accepted",
      "match.tick",
      "action.accepted",
      "action.accepted",
      "match.tick",
      "action.accepted",
      "action.accepted",
      "match.tick",
      "match.ended",
    ],
  );
  expectJsonEqual(
    "typescript sdk event match ids",
    [...new Set(events.map((event) => event.matchID))],
    [matchID],
  );
  const endedEvent = events.find((event) => event.type === "match.ended");
  expectJsonEqual(
    "typescript sdk ended event result",
    endedEvent?.type === "match.ended" ? endedEvent.result : null,
    createdMatch.result,
  );

  try {
    await client.getMatch("missing-sdk-match");
    throw new Error("expected missing match to fail");
  } catch (error) {
    expectCondition(
      "typescript sdk missing match error type",
      error instanceof ArenaClientHttpError,
      { error },
    );

    const clientError = error as ArenaClientHttpError;
    expectJsonEqual("typescript sdk missing match status", clientError.status, 404);
    expectJsonEqual(
      "typescript sdk missing match code",
      clientError.arenaError?.code,
      "match_not_found",
    );
  }

  console.log("OpenFront Agent Arena TypeScript SDK smoke check passed.");
  console.log(
    JSON.stringify(
      {
        baseUrl: server.url,
        matchID,
        checkedMethods: [
          "health",
          "createMatch",
          "listMatches",
          "getMatch",
          "getResult",
          "getReplay",
          "createEventCollector",
        ],
        events: events.map((event) => event.type),
      },
      null,
      2,
    ),
  );
} finally {
  await agentPair.close();
  await server.close();
}
