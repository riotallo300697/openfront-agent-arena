import type { AgentObservation } from "../../runner/src/types";
import { expectJsonEqual } from "../../runner/src/smokeAssert";
import {
  collectArenaSessionCoordinatorDecisions,
  openArenaSessionCoordinatorTurns,
} from "./arenaSessionCoordinator";
import { createInMemoryArenaSessionStore } from "./arenaSessionStore";

const sessionID = "arena-session-coordinator-smoke";
const matchID = "arena-session-coordinator-smoke-match";

function observation({
  clientID,
  name,
  tick,
}: {
  clientID: string;
  name: string;
  tick: number;
}): AgentObservation {
  return {
    tick,
    self: {
      clientID,
      name,
      hasSpawned: true,
      tilesOwned: 12,
    },
    players: [
      {
        playerID: `${clientID}-player`,
        clientID,
        name,
        isAlive: true,
        hasSpawned: true,
        tilesOwned: 12,
      },
    ],
  };
}

const store = createInMemoryArenaSessionStore();
store.createSession({
  sessionID,
  matchID,
  map: "tests/testdata/maps/plains",
  maxTicks: 12,
  agentDecisionTimeoutMs: 1000,
  maxAgents: 2,
});
store.joinSession({
  sessionID,
  clientID: "session-agent-a",
  name: "Session Agent A",
  now: "2026-05-17T00:00:00.000Z",
});
store.joinSession({
  sessionID,
  clientID: "session-agent-b",
  name: "Session Agent B",
  now: "2026-05-17T00:00:00.000Z",
});

const firstOpen = openArenaSessionCoordinatorTurns({
  store,
  sessionID,
  now: new Date("2999-05-17T00:00:01.000Z"),
  observations: [
    observation({
      clientID: "session-agent-a",
      name: "Session Agent A",
      tick: 1,
    }),
    observation({
      clientID: "session-agent-b",
      name: "Session Agent B",
      tick: 1,
    }),
  ],
  supportedActions: ["wait"],
});
expectJsonEqual("arena session coordinator first open", firstOpen, {
  status: "accepted",
  session: {
    sessionID,
    matchID,
    status: "waiting",
    createdAt: firstOpen.status === "accepted" ? firstOpen.session.createdAt : "",
    currentTick: 0,
    map: "tests/testdata/maps/plains",
    maxTicks: 12,
    agentDecisionTimeoutMs: 1000,
    maxAgents: 2,
    agents: [
      {
        clientID: "session-agent-a",
        name: "Session Agent A",
        slotIndex: 0,
        joinedAt: "2026-05-17T00:00:00.000Z",
      },
      {
        clientID: "session-agent-b",
        name: "Session Agent B",
        slotIndex: 1,
        joinedAt: "2026-05-17T00:00:00.000Z",
      },
    ],
  },
  turns: [
    {
      clientID: "session-agent-a",
      status: "opened",
      turnID: "turn-1-session-agent-a",
      deadlineAt: "2999-05-17T00:00:02.000Z",
    },
    {
      clientID: "session-agent-b",
      status: "opened",
      turnID: "turn-1-session-agent-b",
      deadlineAt: "2999-05-17T00:00:02.000Z",
    },
  ],
});

store.submitAction({
  sessionID,
  clientID: "session-agent-a",
  now: new Date("2999-05-17T00:00:01.500Z"),
  request: {
    turnID: "turn-1-session-agent-a",
    action: {
      type: "wait",
    },
  },
});

const mixedDecisions = collectArenaSessionCoordinatorDecisions({
  store,
  sessionID,
  now: new Date("2999-05-17T00:00:01.500Z"),
  turnIDsByClientID: {
    "session-agent-a": "turn-1-session-agent-a",
    "session-agent-b": "turn-1-session-agent-b",
  },
});
expectJsonEqual("arena session coordinator mixed decisions", mixedDecisions, {
  status: "accepted",
  session: firstOpen.status === "accepted" ? firstOpen.session : null,
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
      action: null,
      clientID: "session-agent-b",
      state: "pending",
      turnID: "turn-1-session-agent-b",
    },
  ],
});

const expiredOpen = openArenaSessionCoordinatorTurns({
  store,
  sessionID,
  now: new Date("2000-01-01T00:00:00.000Z"),
  observations: [
    observation({
      clientID: "session-agent-a",
      name: "Session Agent A",
      tick: 2,
    }),
    observation({
      clientID: "session-agent-b",
      name: "Session Agent B",
      tick: 2,
    }),
  ],
  supportedActions: ["wait"],
});
expectJsonEqual(
  "arena session coordinator expired open statuses",
  expiredOpen.status === "accepted"
    ? expiredOpen.turns.map((turn) => turn.status)
    : expiredOpen.status,
  ["opened", "opened"],
);

const expiredDecisions = collectArenaSessionCoordinatorDecisions({
  store,
  sessionID,
  now: new Date("2000-01-01T00:00:02.000Z"),
  turnIDsByClientID: {
    "session-agent-a": "turn-2-session-agent-a",
    "session-agent-b": "turn-2-session-agent-b",
  },
});
expectJsonEqual("arena session coordinator expired decisions", expiredDecisions, {
  status: "accepted",
  session: firstOpen.status === "accepted" ? firstOpen.session : null,
  decisions: [
    {
      action: null,
      clientID: "session-agent-a",
      state: "expired",
      turnID: "turn-2-session-agent-a",
    },
    {
      action: null,
      clientID: "session-agent-b",
      state: "expired",
      turnID: "turn-2-session-agent-b",
    },
  ],
});

const partialOpen = openArenaSessionCoordinatorTurns({
  store,
  sessionID,
  now: new Date("2999-05-17T00:00:03.000Z"),
  observations: [
    observation({
      clientID: "session-agent-a",
      name: "Session Agent A",
      tick: 3,
    }),
  ],
  supportedActions: ["wait"],
});
expectJsonEqual(
  "arena session coordinator partial open turns",
  partialOpen.status === "accepted" ? partialOpen.turns : partialOpen,
  [
    {
      clientID: "session-agent-a",
      status: "opened",
      turnID: "turn-3-session-agent-a",
      deadlineAt: "2999-05-17T00:00:04.000Z",
    },
    {
      clientID: "session-agent-b",
      status: "missing_observation",
    },
  ],
);

const missingAndRejectedDecisions = collectArenaSessionCoordinatorDecisions({
  store,
  sessionID,
  now: new Date("2999-05-17T00:00:03.500Z"),
  turnIDsByClientID: {
    "session-agent-a": "turn-wrong-session-agent-a",
  },
});
expectJsonEqual(
  "arena session coordinator missing and rejected decisions",
  missingAndRejectedDecisions,
  {
    status: "accepted",
    session: firstOpen.status === "accepted" ? firstOpen.session : null,
    decisions: [
      {
        action: null,
        clientID: "session-agent-a",
        reason: "invalid_turn",
        state: "rejected",
        turnID: "turn-wrong-session-agent-a",
      },
      {
        action: null,
        clientID: "session-agent-b",
        state: "missing",
        turnID: null,
      },
    ],
  },
);

console.log("OpenFront Agent Arena session coordinator smoke check passed.");
console.log(
  JSON.stringify(
    {
      sessionID,
      checkedDecisions: ["submitted", "pending", "expired", "missing"],
    },
    null,
    2,
  ),
);
