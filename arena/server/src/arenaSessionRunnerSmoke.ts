import type { AgentObservation } from "../../runner/src/types";
import { expectJsonEqual } from "../../runner/src/smokeAssert";
import { createInMemoryArenaSessionStore } from "./arenaSessionStore";
import { createArenaSessionRunner } from "./arenaSessionRunner";

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

function createJoinedStore({
  maxTicks,
  sessionID,
}: {
  maxTicks: number;
  sessionID: string;
}) {
  const store = createInMemoryArenaSessionStore();
  store.createSession({
    sessionID,
    matchID: `${sessionID}-match`,
    map: "tests/testdata/maps/plains",
    maxTicks,
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
  return store;
}

const sessionID = "arena-session-runner-smoke";
const store = createJoinedStore({
  maxTicks: 2,
  sessionID,
});
const runner = createArenaSessionRunner({
  sessionID,
  store,
  supportedActions: ["wait"],
});

expectJsonEqual("arena session runner initial state", runner.getState(), {
  sessionID,
  currentTick: 0,
  status: "idle",
  activeTurn: null,
});

const openTickOne = runner.openTurnBatch({
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
});
expectJsonEqual("arena session runner open tick one", {
  status: openTickOne.status,
  state: openTickOne.status === "accepted" ? openTickOne.state : null,
  decisions: openTickOne.status === "accepted" ? openTickOne.decisions : null,
}, {
  status: "accepted",
  state: {
    sessionID,
    currentTick: 0,
    status: "collecting",
    activeTurn: {
      openedAt: "2999-05-17T00:00:01.000Z",
      tick: 1,
      turnIDsByClientID: {
        "session-agent-a": "turn-1-session-agent-a",
        "session-agent-b": "turn-1-session-agent-b",
      },
    },
  },
  decisions: [
    {
      action: null,
      clientID: "session-agent-a",
      state: "missing",
      turnID: null,
    },
    {
      action: null,
      clientID: "session-agent-b",
      state: "missing",
      turnID: null,
    },
  ],
});

const duplicateOpen = runner.openTurnBatch({
  now: new Date("2999-05-17T00:00:01.100Z"),
  observations: [],
});
expectJsonEqual("arena session runner duplicate open", duplicateOpen, {
  status: "rejected",
  reason: "turn_already_open",
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

const partialCollect = runner.collectTurnDecisions({
  now: new Date("2999-05-17T00:00:01.500Z"),
});
expectJsonEqual("arena session runner partial collect", {
  status: partialCollect.status,
  state: partialCollect.status === "accepted" ? partialCollect.state : null,
  decisions: partialCollect.status === "accepted" ? partialCollect.decisions : null,
}, {
  status: "accepted",
  state: {
    sessionID,
    currentTick: 0,
    status: "collecting",
    activeTurn: {
      openedAt: "2999-05-17T00:00:01.000Z",
      tick: 1,
      turnIDsByClientID: {
        "session-agent-a": "turn-1-session-agent-a",
        "session-agent-b": "turn-1-session-agent-b",
      },
    },
  },
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

store.submitAction({
  sessionID,
  clientID: "session-agent-b",
  now: new Date("2999-05-17T00:00:01.600Z"),
  request: {
    turnID: "turn-1-session-agent-b",
    action: {
      type: "wait",
    },
  },
});

const completedTickOne = runner.collectTurnDecisions({
  now: new Date("2999-05-17T00:00:01.600Z"),
});
expectJsonEqual("arena session runner completed tick one", {
  status: completedTickOne.status,
  state: completedTickOne.status === "accepted" ? completedTickOne.state : null,
  decisions:
    completedTickOne.status === "accepted" ? completedTickOne.decisions : null,
}, {
  status: "accepted",
  state: {
    sessionID,
    currentTick: 1,
    status: "idle",
    activeTurn: null,
  },
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
});

runner.openTurnBatch({
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
});

const expiredTickTwo = runner.collectTurnDecisions({
  now: new Date("2000-01-01T00:00:02.000Z"),
});
expectJsonEqual("arena session runner expired tick two", {
  status: expiredTickTwo.status,
  state: expiredTickTwo.status === "accepted" ? expiredTickTwo.state : null,
  decisions: expiredTickTwo.status === "accepted" ? expiredTickTwo.decisions : null,
}, {
  status: "accepted",
  state: {
    sessionID,
    currentTick: 2,
    status: "completed",
    activeTurn: null,
  },
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

const openAfterCompleted = runner.openTurnBatch({
  now: new Date("2999-05-17T00:00:03.000Z"),
  observations: [],
});
expectJsonEqual("arena session runner open after completed", openAfterCompleted, {
  status: "rejected",
  reason: "session_completed",
});

const partialSessionID = "arena-session-runner-partial-smoke";
const partialStore = createJoinedStore({
  maxTicks: 3,
  sessionID: partialSessionID,
});
const partialRunner = createArenaSessionRunner({
  sessionID: partialSessionID,
  store: partialStore,
  supportedActions: ["wait"],
});
const partialOpen = partialRunner.openTurnBatch({
  now: new Date("2999-05-17T00:00:01.000Z"),
  observations: [
    observation({
      clientID: "session-agent-a",
      name: "Session Agent A",
      tick: 1,
    }),
  ],
});
expectJsonEqual("arena session runner partial observation open", {
  status: partialOpen.status,
  decisions: partialOpen.status === "accepted" ? partialOpen.decisions : null,
}, {
  status: "accepted",
  decisions: [
    {
      action: null,
      clientID: "session-agent-a",
      state: "missing",
      turnID: null,
    },
    {
      action: null,
      clientID: "session-agent-b",
      state: "missing",
      turnID: null,
    },
  ],
});

partialStore.submitAction({
  sessionID: partialSessionID,
  clientID: "session-agent-a",
  now: new Date("2999-05-17T00:00:01.500Z"),
  request: {
    turnID: "turn-1-session-agent-a",
    action: {
      type: "wait",
    },
  },
});
const partialCompleted = partialRunner.collectTurnDecisions({
  now: new Date("2999-05-17T00:00:01.500Z"),
});
expectJsonEqual("arena session runner partial observation collect", {
  status: partialCompleted.status,
  state: partialCompleted.status === "accepted" ? partialCompleted.state : null,
  decisions:
    partialCompleted.status === "accepted" ? partialCompleted.decisions : null,
}, {
  status: "accepted",
  state: {
    sessionID: partialSessionID,
    currentTick: 1,
    status: "idle",
    activeTurn: null,
  },
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
      state: "missing",
      turnID: null,
    },
  ],
});

console.log("OpenFront Agent Arena session runner smoke check passed.");
console.log(
  JSON.stringify(
    {
      sessionID,
      checkedStates: ["idle", "collecting", "completed"],
      checkedDecisions: ["submitted", "pending", "expired", "missing"],
    },
    null,
    2,
  ),
);
