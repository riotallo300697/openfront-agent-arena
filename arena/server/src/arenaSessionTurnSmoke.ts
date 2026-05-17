import type { AgentObservation } from "../../runner/src/types";
import { expectJsonEqual } from "../../runner/src/smokeAssert";
import { createInMemoryArenaSessionStore } from "./arenaSessionStore";
import {
  openArenaSessionTurn,
  openArenaSessionTurns,
  resolveArenaSessionTurnState,
} from "./arenaSessionTurn";

const sessionID = "arena-session-turn-smoke";
const matchID = "arena-session-turn-smoke-match";

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

const missingTurn = resolveArenaSessionTurnState({
  store,
  sessionID,
  clientID: "session-agent-a",
  turnID: "turn-1-session-agent-a",
  now: new Date("2999-05-17T00:00:01.000Z"),
});
expectJsonEqual("arena session turn missing state", missingTurn, {
  status: "accepted",
  state: "missing",
});

const openPendingTurn = openArenaSessionTurn({
  store,
  sessionID,
  observation: observation({
    clientID: "session-agent-a",
    name: "Session Agent A",
    tick: 1,
  }),
  now: new Date("2999-05-17T00:00:01.000Z"),
  supportedActions: ["wait"],
});
expectJsonEqual("arena session turn open pending status", openPendingTurn.status, "accepted");

const pendingTurn = resolveArenaSessionTurnState({
  store,
  sessionID,
  clientID: "session-agent-a",
  turnID: "turn-1-session-agent-a",
  now: new Date("2999-05-17T00:00:01.500Z"),
});
expectJsonEqual("arena session turn pending state", pendingTurn, {
  status: "accepted",
  state: "pending",
  pendingAction: {
    sessionID,
    matchID,
    clientID: "session-agent-a",
    turnID: "turn-1-session-agent-a",
    tick: 1,
    observation: observation({
      clientID: "session-agent-a",
      name: "Session Agent A",
      tick: 1,
    }),
    deadlineAt: "2999-05-17T00:00:02.000Z",
    supportedActions: ["wait"],
  },
});

const wrongTurn = resolveArenaSessionTurnState({
  store,
  sessionID,
  clientID: "session-agent-a",
  turnID: "turn-404-session-agent-a",
  now: new Date("2999-05-17T00:00:01.500Z"),
});
expectJsonEqual("arena session turn wrong turn state", wrongTurn, {
  status: "rejected",
  reason: "invalid_turn",
});

const submitted = store.submitAction({
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
expectJsonEqual("arena session turn submit action status", submitted.status, "accepted");

const submittedTurn = resolveArenaSessionTurnState({
  store,
  sessionID,
  clientID: "session-agent-a",
  turnID: "turn-1-session-agent-a",
  now: new Date("2999-05-17T00:00:01.500Z"),
});
expectJsonEqual("arena session turn submitted state", submittedTurn, {
  status: "accepted",
  state: "submitted",
  submittedAction: {
    sessionID,
    matchID,
    clientID: "session-agent-a",
    turnID: "turn-1-session-agent-a",
    accepted: true,
    status: "waiting",
    action: {
      type: "wait",
    },
  },
});

const submittedTurnAgain = resolveArenaSessionTurnState({
  store,
  sessionID,
  clientID: "session-agent-a",
  turnID: "turn-1-session-agent-a",
  now: new Date("2999-05-17T00:00:01.500Z"),
});
expectJsonEqual("arena session turn submitted consumed state", submittedTurnAgain, {
  status: "accepted",
  state: "missing",
});

const openExpiredTurn = openArenaSessionTurn({
  store,
  sessionID,
  observation: observation({
    clientID: "session-agent-a",
    name: "Session Agent A",
    tick: 2,
  }),
  now: new Date("2000-01-01T00:00:00.000Z"),
  supportedActions: ["wait"],
});
expectJsonEqual("arena session turn open expired status", openExpiredTurn.status, "accepted");

const expiredTurn = resolveArenaSessionTurnState({
  store,
  sessionID,
  clientID: "session-agent-a",
  turnID: "turn-2-session-agent-a",
  now: new Date("2000-01-01T00:00:02.000Z"),
});
expectJsonEqual("arena session turn expired state", expiredTurn, {
  status: "accepted",
  state: "expired",
  expiredTicket: {
    sessionID,
    matchID,
    clientID: "session-agent-a",
    turnID: "turn-2-session-agent-a",
    tick: 2,
    observation: observation({
      clientID: "session-agent-a",
      name: "Session Agent A",
      tick: 2,
    }),
    deadlineAt: "2000-01-01T00:00:01.000Z",
    supportedActions: ["wait"],
  },
});

const openedTurns = openArenaSessionTurns({
  store,
  sessionID,
  now: new Date("2999-05-17T00:00:03.000Z"),
  observations: [
    observation({
      clientID: "session-agent-a",
      name: "Session Agent A",
      tick: 3,
    }),
    observation({
      clientID: "session-agent-b",
      name: "Session Agent B",
      tick: 3,
    }),
  ],
  supportedActions: ["wait"],
});
expectJsonEqual(
  "arena session turn open batch statuses",
  openedTurns.map((turn) => turn.status),
  ["accepted", "accepted"],
);

const pendingBatchTurn = resolveArenaSessionTurnState({
  store,
  sessionID,
  clientID: "session-agent-b",
  turnID: "turn-3-session-agent-b",
  now: new Date("2999-05-17T00:00:03.500Z"),
});
expectJsonEqual("arena session turn pending batch state", pendingBatchTurn, {
  status: "accepted",
  state: "pending",
  pendingAction: {
    sessionID,
    matchID,
    clientID: "session-agent-b",
    turnID: "turn-3-session-agent-b",
    tick: 3,
    observation: observation({
      clientID: "session-agent-b",
      name: "Session Agent B",
      tick: 3,
    }),
    deadlineAt: "2999-05-17T00:00:04.000Z",
    supportedActions: ["wait"],
  },
});

console.log("OpenFront Agent Arena session turn smoke check passed.");
console.log(
  JSON.stringify(
    {
      sessionID,
      checkedStates: ["missing", "pending", "submitted", "expired"],
    },
    null,
    2,
  ),
);
