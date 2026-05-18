import { expectJsonEqual } from "../../runner/src/smokeAssert";
import type { ArenaSessionCompletionSummary } from "./arenaSessionCompletion";
import { buildArenaSessionMatchArtifact } from "./arenaSessionMatchArtifact";

const completion: ArenaSessionCompletionSummary = {
  agentDecisionTimeoutMs: 1000,
  agents: [
    {
      clientID: "session-agent-a",
      decisions: {
        expired: 0,
        missing: 0,
        pending: 0,
        rejected: 0,
        submitted: 2,
        total: 2,
      },
      finalObservation: {
        hasSpawned: true,
        isAlive: true,
        tick: 2,
        tilesOwned: 14,
      },
      name: "Session Agent A",
      slotIndex: 0,
    },
    {
      clientID: "session-agent-b",
      decisions: {
        expired: 1,
        missing: 0,
        pending: 0,
        rejected: 0,
        submitted: 1,
        total: 2,
      },
      finalObservation: {
        hasSpawned: true,
        isAlive: true,
        tick: 2,
        tilesOwned: 10,
      },
      name: "Session Agent B",
      slotIndex: 1,
    },
  ],
  completedAt: "2999-05-18T00:00:02.000Z",
  createdAt: "2999-05-18T00:00:00.000Z",
  currentTick: 2,
  decisions: {
    expired: 1,
    missing: 0,
    pending: 0,
    rejected: 0,
    submitted: 3,
    total: 4,
  },
  map: "tests/testdata/maps/plains",
  matchID: "arena-session-artifact-smoke-match",
  maxTicks: 2,
  replay: null,
  runner: "api-session",
  sessionID: "arena-session-artifact-smoke",
  status: "completed",
  ticks: 2,
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
    {
      tick: 2,
      decisions: [
        {
          action: {
            type: "wait",
          },
          clientID: "session-agent-a",
          state: "submitted",
          turnID: "turn-2-session-agent-a",
        },
        {
          action: null,
          clientID: "session-agent-b",
          state: "expired",
          turnID: "turn-2-session-agent-b",
        },
      ],
    },
  ],
};

const artifact = buildArenaSessionMatchArtifact(completion);

expectJsonEqual("arena session match artifact", artifact, {
  agentDecisionTimeoutMs: 1000,
  agents: completion.agents,
  completedAt: "2999-05-18T00:00:02.000Z",
  createdAt: "2999-05-18T00:00:00.000Z",
  decisions: completion.decisions,
  format: "openfront-agent-arena-session-match-artifact",
  map: "tests/testdata/maps/plains",
  matchID: "arena-session-artifact-smoke-match",
  maxTicks: 2,
  replay: {
    format: "openfront-agent-arena-jsonl",
    path: null,
  },
  result: {
    agents: completion.agents,
    decisions: completion.decisions,
    replay: null,
    ticks: 2,
    updates: null,
  },
  runner: "api-session",
  sessionID: "arena-session-artifact-smoke",
  status: "completed",
  turns: completion.turns,
  version: 1,
});

completion.agents[0].finalObservation = null;
completion.turns[0].decisions[0].action = null;
expectJsonEqual("arena session match artifact clones source", {
  firstAgentObservation: artifact.agents[0].finalObservation,
  firstTurnAction: artifact.turns[0].decisions[0].action,
}, {
  firstAgentObservation: {
    hasSpawned: true,
    isAlive: true,
    tick: 2,
    tilesOwned: 14,
  },
  firstTurnAction: {
    type: "wait",
  },
});

console.log("OpenFront Agent Arena session match artifact smoke check passed.");
console.log(
  JSON.stringify(
    {
      sessionID: artifact.sessionID,
      matchID: artifact.matchID,
      format: artifact.format,
      runner: artifact.runner,
    },
    null,
    2,
  ),
);
