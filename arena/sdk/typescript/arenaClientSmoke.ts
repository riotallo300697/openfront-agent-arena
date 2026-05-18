import { startHttpExampleAgentPair } from "../../agents/httpExampleAgentLauncher";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import { startArenaApiServer } from "../../server/src/arenaApiServer";
import type { ArenaSessionCompletionSummary } from "../../server/src/arenaSessionCompletion";
import {
  buildArenaSessionMatchArtifact,
  type ArenaSessionMatchArtifact,
} from "../../server/src/arenaSessionMatchArtifact";
import { ArenaClient, ArenaClientHttpError } from "./arenaClient";

function sessionArtifactFixture(): ArenaSessionMatchArtifact {
  const completion: ArenaSessionCompletionSummary = {
    agentDecisionTimeoutMs: 1000,
    agents: [
      {
        clientID: "sdk-session-agent-a",
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
        name: "SDK Session Agent A",
        slotIndex: 0,
      },
      {
        clientID: "sdk-session-agent-b",
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
        name: "SDK Session Agent B",
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
    matchID: "arena-sdk-typescript-session-artifact-match",
    maxTicks: 1,
    replay: null,
    runner: "api-session",
    sessionID: "arena-sdk-typescript-session-artifact",
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
            clientID: "sdk-session-agent-a",
            state: "submitted",
            turnID: "turn-1-sdk-session-agent-a",
          },
          {
            action: {
              type: "wait",
            },
            clientID: "sdk-session-agent-b",
            state: "submitted",
            turnID: "turn-1-sdk-session-agent-b",
          },
        ],
      },
    ],
  };

  return buildArenaSessionMatchArtifact(completion);
}

const sessionArtifact = sessionArtifactFixture();
const server = await startArenaApiServer({
  sessionMatchArtifacts: new Map([[sessionArtifact.sessionID, sessionArtifact]]),
});
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

  const listedArtifacts = await client.listSessionArtifacts();
  expectJsonEqual("typescript sdk list session artifacts", listedArtifacts, {
    artifacts: [sessionArtifact],
  });

  const readArtifact = await client.getSessionArtifact(sessionArtifact.sessionID);
  expectJsonEqual("typescript sdk get session artifact", readArtifact, sessionArtifact);

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

  try {
    await client.getSessionArtifact("missing-sdk-session-artifact");
    throw new Error("expected missing session artifact to fail");
  } catch (error) {
    expectCondition(
      "typescript sdk missing session artifact error type",
      error instanceof ArenaClientHttpError,
      { error },
    );

    const clientError = error as ArenaClientHttpError;
    expectJsonEqual(
      "typescript sdk missing session artifact status",
      clientError.status,
      404,
    );
    expectJsonEqual(
      "typescript sdk missing session artifact code",
      clientError.arenaError?.code,
      "session_artifact_not_found",
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
          "listSessionArtifacts",
          "getSessionArtifact",
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
