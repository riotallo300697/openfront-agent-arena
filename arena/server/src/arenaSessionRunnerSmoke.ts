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
const createdSession = store.getSession(sessionID);

expectJsonEqual("arena session runner initial state", runner.getState(), {
  sessionID,
  currentTick: 0,
  status: "idle",
  activeTurn: null,
});
expectJsonEqual("arena session runner initial completion", runner.getCompletion(), null);

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
expectJsonEqual("arena session runner store running after open", store.getSession(sessionID)?.status, "running");
expectJsonEqual("arena session runner store tick after open", store.getSession(sessionID)?.currentTick, 0);

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
expectJsonEqual("arena session runner store running after tick one", {
  currentTick: store.getSession(sessionID)?.currentTick,
  status: store.getSession(sessionID)?.status,
}, {
  currentTick: 1,
  status: "running",
});
expectJsonEqual(
  "arena session runner completion after tick one",
  completedTickOne.status === "accepted" ? completedTickOne.completion : null,
  null,
);

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
expectJsonEqual("arena session runner store completed after tick two", {
  completedAt: store.getSession(sessionID)?.completedAt,
  currentTick: store.getSession(sessionID)?.currentTick,
  status: store.getSession(sessionID)?.status,
}, {
  completedAt: "2000-01-01T00:00:02.000Z",
  currentTick: 2,
  status: "completed",
});
const completionSummary =
  expiredTickTwo.status === "accepted" ? expiredTickTwo.completion : null;
expectJsonEqual("arena session runner completion summary", completionSummary, {
  agentDecisionTimeoutMs: 1000,
  agents: [
    {
      clientID: "session-agent-a",
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
        tilesOwned: 12,
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
        tilesOwned: 12,
      },
      name: "Session Agent B",
      slotIndex: 1,
    },
  ],
  completedAt: "2000-01-01T00:00:02.000Z",
  createdAt: createdSession?.createdAt,
  currentTick: 2,
  decisions: {
    expired: 2,
    missing: 0,
    pending: 0,
    rejected: 0,
    submitted: 2,
    total: 4,
  },
  matchID: `${sessionID}-match`,
  map: "tests/testdata/maps/plains",
  maxTicks: 2,
  replay: null,
  runner: "api-session",
  sessionID,
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
    },
  ],
});
expectJsonEqual("arena session runner get completion summary", runner.getCompletion(), completionSummary);
expectJsonEqual("arena session runner match artifact summary", {
  format: runner.getMatchArtifact()?.format,
  matchID: runner.getMatchArtifact()?.matchID,
  replay: runner.getMatchArtifact()?.replay,
  runner: runner.getMatchArtifact()?.runner,
  sessionID: runner.getMatchArtifact()?.sessionID,
  status: runner.getMatchArtifact()?.status,
  ticks: runner.getMatchArtifact()?.result.ticks,
  turns: runner.getMatchArtifact()?.turns.length,
}, {
  format: "openfront-agent-arena-session-match-artifact",
  matchID: `${sessionID}-match`,
  replay: {
    format: "openfront-agent-arena-jsonl",
    path: null,
  },
  runner: "api-session",
  sessionID,
  status: "completed",
  ticks: 2,
  turns: 2,
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
