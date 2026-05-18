import fs from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "../../runner/src/headless";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import type { AgentObservation } from "../../runner/src/types";
import { startArenaApiServer } from "./arenaApiServer";
import type { ArenaSessionCompletionSummary } from "./arenaSessionCompletion";
import {
  buildArenaSessionMatchArtifact,
  buildArenaSessionMatchArtifactSummary,
  type ArenaSessionMatchArtifact,
} from "./arenaSessionMatchArtifact";
import {
  createArenaSessionMatchArtifactRegistry,
  type ArenaSessionMatchArtifactRegistry,
} from "./arenaSessionMatchArtifactRegistry";
import { createJsonlArenaSessionMatchArtifactStore } from "./arenaSessionMatchArtifactStore";
import type { ArenaSessionRunner } from "./arenaSessionRunner";
import { createInMemoryArenaSessionStore } from "./arenaSessionStore";

const tempRoot = path.join(repoRoot, "arena/tmp");
await fs.mkdir(tempRoot, { recursive: true });
const tempDir = await fs.mkdtemp(path.join(tempRoot, "api-session-artifact-store-"));
const storePath = path.join(tempDir, "session-artifacts.jsonl");
const sessionMatchArtifactStore = createJsonlArenaSessionMatchArtifactStore(storePath);
const sessionMatchArtifactRegistry = createArenaSessionMatchArtifactRegistry();
const sessionMatchArtifacts = new Map<string, ArenaSessionMatchArtifact>();
const sessionMatchArtifactWrites = new Map<string, Promise<void>>();
const sessionRunners = new Map<string, ArenaSessionRunner>();
const sessionStore = createInMemoryArenaSessionStore();

function completionFixture({
  matchID,
  sessionID,
}: {
  matchID: string;
  sessionID: string;
}): ArenaSessionCompletionSummary {
  return {
    agentDecisionTimeoutMs: 1000,
    agents: [
      {
        clientID: "session-agent-a",
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
        name: "Session Agent A",
        slotIndex: 0,
      },
      {
        clientID: "session-agent-b",
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
        name: "Session Agent B",
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
    matchID,
    maxTicks: 1,
    replay: null,
    runner: "api-session",
    sessionID,
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
            clientID: "session-agent-a",
            state: "submitted",
            turnID: "turn-1-session-agent-a",
          },
          {
            action: {
              type: "wait",
            },
            clientID: "session-agent-b",
            state: "submitted",
            turnID: "turn-1-session-agent-b",
          },
        ],
      },
    ],
  };
}

function observation({
  clientID,
  name,
  tilesOwned,
}: {
  clientID: string;
  name: string;
  tilesOwned: number;
}): AgentObservation {
  return {
    tick: 1,
    self: {
      clientID,
      name,
      hasSpawned: true,
      tilesOwned,
    },
    players: [
      {
        playerID: "player-a",
        clientID: "session-agent-a",
        name: "Session Agent A",
        isAlive: true,
        hasSpawned: true,
        tilesOwned: 12,
      },
      {
        playerID: "player-b",
        clientID: "session-agent-b",
        name: "Session Agent B",
        isAlive: true,
        hasSpawned: true,
        tilesOwned: 10,
      },
    ],
  };
}

async function postJson(baseUrl: string, route: string, body: unknown) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    body: (await response.json()) as unknown,
    status: response.status,
  };
}

async function readJson(baseUrl: string, route: string) {
  const response = await fetch(`${baseUrl}${route}`);
  return {
    body: (await response.json()) as unknown,
    status: response.status,
  };
}

const preloadedArtifact = buildArenaSessionMatchArtifact(
  completionFixture({
    sessionID: "preloaded-session-artifact",
    matchID: "preloaded-session-artifact-match",
  }),
);
await sessionMatchArtifactStore.saveArtifact(preloadedArtifact);

const server = await startArenaApiServer({
  sessionMatchArtifactRegistry,
  sessionMatchArtifactStore,
  sessionMatchArtifactWrites,
  sessionMatchArtifacts,
  sessionRunners,
  sessionStore,
});

try {
  expectJsonEqual(
    "arena api session artifact store preloads artifact",
    sessionMatchArtifacts.get("preloaded-session-artifact"),
    preloadedArtifact,
  );
  expectArtifactRegistry(
    "arena api session artifact registry preloads artifact",
    sessionMatchArtifactRegistry,
    preloadedArtifact,
  );
  const initialArtifactList = await readJson(server.url, "/arena/session-artifacts");
  expectJsonEqual("arena api session artifacts initial list", initialArtifactList, {
    body: {
      artifacts: [preloadedArtifact],
    },
    status: 200,
  });
  const readPreloadedArtifact = await readJson(
    server.url,
    "/arena/session-artifacts/preloaded-session-artifact",
  );
  expectJsonEqual("arena api session artifacts read preloaded", readPreloadedArtifact, {
    body: preloadedArtifact,
    status: 200,
  });
  const initialSummaryList = await readJson(
    server.url,
    "/arena/session-artifact-summaries",
  );
  expectJsonEqual("arena api session artifact summaries initial list", initialSummaryList, {
    body: {
      artifacts: [buildArenaSessionMatchArtifactSummary(preloadedArtifact)],
    },
    status: 200,
  });
  const readPreloadedSummary = await readJson(
    server.url,
    "/arena/session-artifact-summaries/preloaded-session-artifact",
  );
  expectJsonEqual("arena api session artifact summaries read preloaded", readPreloadedSummary, {
    body: buildArenaSessionMatchArtifactSummary(preloadedArtifact),
    status: 200,
  });
  const missingArtifact = await readJson(
    server.url,
    "/arena/session-artifacts/missing-session-artifact",
  );
  expectJsonEqual("arena api session artifacts missing", missingArtifact, {
    body: {
      error: {
        code: "session_artifact_not_found",
        message: "Arena session artifact was not found",
        details: {
          sessionID: "missing-session-artifact",
        },
      },
    },
    status: 404,
  });
  const missingSummary = await readJson(
    server.url,
    "/arena/session-artifact-summaries/missing-session-artifact",
  );
  expectJsonEqual("arena api session artifact summaries missing", missingSummary, {
    body: {
      error: {
        code: "session_artifact_not_found",
        message: "Arena session artifact was not found",
        details: {
          sessionID: "missing-session-artifact",
        },
      },
    },
    status: 404,
  });
  const invalidArtifactMethod = await postJson(
    server.url,
    "/arena/session-artifacts",
    {},
  );
  expectJsonEqual(
    "arena api session artifacts invalid method",
    {
      body: invalidArtifactMethod.body,
      status: invalidArtifactMethod.status,
    },
    {
      body: {
        error: {
          code: "method_not_allowed",
          message: "GET /arena/session-artifacts is required",
          details: {
            method: "POST",
          },
        },
      },
      status: 405,
    },
  );
  const invalidSummaryMethod = await postJson(
    server.url,
    "/arena/session-artifact-summaries",
    {},
  );
  expectJsonEqual(
    "arena api session artifact summaries invalid method",
    {
      body: invalidSummaryMethod.body,
      status: invalidSummaryMethod.status,
    },
    {
      body: {
        error: {
          code: "method_not_allowed",
          message: "GET /arena/session-artifact-summaries is required",
          details: {
            method: "POST",
          },
        },
      },
      status: 405,
    },
  );

  const sessionID = "api-session-artifact-store-smoke";
  const matchID = "api-session-artifact-store-smoke-match";
  const createSession = await postJson(server.url, "/arena/sessions", {
    sessionID,
    matchID,
    map: "tests/testdata/maps/plains",
    maxTicks: 1,
    agentDecisionTimeoutMs: 1000,
    maxAgents: 2,
  });
  expectJsonEqual("arena api session artifact store create status", createSession.status, 200);
  expectJsonEqual(
    "arena api session artifact store join a status",
    (
      await postJson(server.url, `/arena/sessions/${sessionID}/agents`, {
        clientID: "session-agent-a",
        name: "Session Agent A",
      })
    ).status,
    200,
  );
  expectJsonEqual(
    "arena api session artifact store join b status",
    (
      await postJson(server.url, `/arena/sessions/${sessionID}/agents`, {
        clientID: "session-agent-b",
        name: "Session Agent B",
      })
    ).status,
    200,
  );

  const runner = sessionRunners.get(sessionID);
  expectCondition("arena api session artifact store runner exists", runner !== undefined, {
    sessionRunners: Array.from(sessionRunners.keys()),
  });
  if (runner === undefined) {
    throw new Error("expected session runner");
  }

  expectJsonEqual(
    "arena api session artifact store open turn status",
    runner.openTurnBatch({
      now: new Date("2999-05-18T00:01:00.000Z"),
      observations: [
        observation({
          clientID: "session-agent-a",
          name: "Session Agent A",
          tilesOwned: 12,
        }),
        observation({
          clientID: "session-agent-b",
          name: "Session Agent B",
          tilesOwned: 10,
        }),
      ],
    }).status,
    "accepted",
  );
  expectJsonEqual(
    "arena api session artifact store submit a status",
    (
      await postJson(server.url, `/arena/sessions/${sessionID}/agents/session-agent-a/actions`, {
        turnID: "turn-1-session-agent-a",
        action: {
          type: "wait",
        },
      })
    ).status,
    200,
  );
  expectJsonEqual(
    "arena api session artifact store submit b status",
    (
      await postJson(server.url, `/arena/sessions/${sessionID}/agents/session-agent-b/actions`, {
        turnID: "turn-1-session-agent-b",
        action: {
          type: "wait",
        },
      })
    ).status,
    200,
  );

  const collected = runner.collectTurnDecisions({
    now: new Date("2999-05-18T00:01:00.500Z"),
  });
  expectJsonEqual("arena api session artifact store collect status", collected.status, "accepted");

  const artifactWrite = sessionMatchArtifactWrites.get(sessionID);
  expectCondition(
    "arena api session artifact store write registered",
    artifactWrite !== undefined,
    { writes: Array.from(sessionMatchArtifactWrites.keys()) },
  );
  await artifactWrite;

  const loadedArtifacts = await sessionMatchArtifactStore.loadArtifacts();
  expectJsonEqual(
    "arena api session artifact store loaded artifact ids",
    loadedArtifacts.map((artifact) => ({
      matchID: artifact.matchID,
      sessionID: artifact.sessionID,
    })),
    [
      {
        matchID: "preloaded-session-artifact-match",
        sessionID: "preloaded-session-artifact",
      },
      {
        matchID,
        sessionID,
      },
    ],
  );
  expectJsonEqual("arena api session artifact store registry artifact", {
    artifact: {
      matchID: sessionMatchArtifacts.get(sessionID)?.matchID,
      sessionID: sessionMatchArtifacts.get(sessionID)?.sessionID,
    },
    stored: {
      matchID: loadedArtifacts[1]?.matchID,
      sessionID: loadedArtifacts[1]?.sessionID,
    },
  }, {
    artifact: {
      matchID,
      sessionID,
    },
    stored: {
      matchID,
      sessionID,
    },
  });
  const completedArtifact = sessionMatchArtifacts.get(sessionID);
  expectCondition(
    "arena api session artifact registry completed artifact exists",
    completedArtifact !== undefined,
    { artifacts: Array.from(sessionMatchArtifacts.keys()) },
  );
  if (completedArtifact === undefined) {
    throw new Error("expected completed session artifact");
  }
  expectArtifactRegistry(
    "arena api session artifact registry completed artifact",
    sessionMatchArtifactRegistry,
    completedArtifact,
  );
  expectJsonEqual(
    "arena api session artifact registry list",
    sessionMatchArtifactRegistry.list().map((artifact) => ({
      matchID: artifact.matchID,
      sessionID: artifact.sessionID,
    })),
    [
      {
        matchID: "preloaded-session-artifact-match",
        sessionID: "preloaded-session-artifact",
      },
      {
        matchID,
        sessionID,
      },
    ],
  );
  const finalArtifactList = await readJson(server.url, "/arena/session-artifacts");
  expectJsonEqual(
    "arena api session artifacts final list ids",
    {
      status: finalArtifactList.status,
      artifacts:
        typeof finalArtifactList.body === "object" &&
        finalArtifactList.body !== null &&
        "artifacts" in finalArtifactList.body &&
        Array.isArray(finalArtifactList.body.artifacts)
          ? finalArtifactList.body.artifacts.map((artifact) => ({
              matchID:
                typeof artifact === "object" &&
                artifact !== null &&
                "matchID" in artifact
                  ? artifact.matchID
                  : null,
              sessionID:
                typeof artifact === "object" &&
                artifact !== null &&
                "sessionID" in artifact
                  ? artifact.sessionID
                  : null,
            }))
          : [],
    },
    {
      status: 200,
      artifacts: [
        {
          matchID: "preloaded-session-artifact-match",
          sessionID: "preloaded-session-artifact",
        },
        {
          matchID,
          sessionID,
        },
      ],
    },
  );
  const readCompletedArtifact = await readJson(
    server.url,
    `/arena/session-artifacts/${sessionID}`,
  );
  expectJsonEqual("arena api session artifacts read completed", readCompletedArtifact, {
    body: completedArtifact,
    status: 200,
  });
  const finalSummaryList = await readJson(
    server.url,
    "/arena/session-artifact-summaries",
  );
  expectJsonEqual(
    "arena api session artifact summaries final list ids",
    {
      status: finalSummaryList.status,
      artifacts:
        typeof finalSummaryList.body === "object" &&
        finalSummaryList.body !== null &&
        "artifacts" in finalSummaryList.body &&
        Array.isArray(finalSummaryList.body.artifacts)
          ? finalSummaryList.body.artifacts.map((artifact) => ({
              matchID:
                typeof artifact === "object" &&
                artifact !== null &&
                "matchID" in artifact
                  ? artifact.matchID
                  : null,
              sessionID:
                typeof artifact === "object" &&
                artifact !== null &&
                "sessionID" in artifact
                  ? artifact.sessionID
                  : null,
              turns:
                typeof artifact === "object" &&
                artifact !== null &&
                "turns" in artifact
                  ? artifact.turns
                  : null,
            }))
          : [],
    },
    {
      status: 200,
      artifacts: [
        {
          matchID: "preloaded-session-artifact-match",
          sessionID: "preloaded-session-artifact",
          turns: null,
        },
        {
          matchID,
          sessionID,
          turns: null,
        },
      ],
    },
  );
  const readCompletedSummary = await readJson(
    server.url,
    `/arena/session-artifact-summaries/${sessionID}`,
  );
  expectJsonEqual("arena api session artifact summaries read completed", readCompletedSummary, {
    body: buildArenaSessionMatchArtifactSummary(completedArtifact),
    status: 200,
  });

  console.log("OpenFront Agent Arena API session artifact store smoke check passed.");
  console.log(
    JSON.stringify(
      {
        storePath,
        loadedArtifacts: loadedArtifacts.length,
        sessionID,
        matchID,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}

function expectArtifactRegistry(
  name: string,
  registry: ArenaSessionMatchArtifactRegistry,
  artifact: ArenaSessionMatchArtifact,
) {
  expectJsonEqual(name, {
    byMatchID: registry.getByMatchID(artifact.matchID),
    byMissingMatchID: registry.getByMatchID(`${artifact.matchID}-missing`),
    byMissingSessionID: registry.getBySessionID(`${artifact.sessionID}-missing`),
    bySessionID: registry.getBySessionID(artifact.sessionID),
  }, {
    byMatchID: artifact,
    byMissingMatchID: null,
    byMissingSessionID: null,
    bySessionID: artifact,
  });
}
