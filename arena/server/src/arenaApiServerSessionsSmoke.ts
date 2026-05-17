import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";
import { startArenaApiServer } from "./arenaApiServer";
import { createArenaSessionPendingObservation } from "./arenaSessionPendingAction";
import { createInMemoryArenaSessionStore } from "./arenaSessionStore";

const sessionStore = createInMemoryArenaSessionStore();
const server = await startArenaApiServer({ sessionStore });

const createSessionRequest = {
  sessionID: "arena-session-smoke",
  matchID: "arena-session-smoke-match",
  map: "tests/testdata/maps/plains",
  maxTicks: 12,
  agentDecisionTimeoutMs: 1000,
  maxAgents: 2,
};

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${server.url}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(path: string): Promise<{
  body: unknown;
  status: number;
}> {
  const response = await fetch(`${server.url}${path}`);
  return {
    body: (await response.json()) as unknown,
    status: response.status,
  };
}

try {
  const emptyList = await readJson("/arena/sessions");
  expectJsonEqual("arena sessions initial status", emptyList.status, 200);
  expectJsonEqual("arena sessions initial list", emptyList.body, {
    sessions: [],
  });

  const invalidCreateResponse = await postJson("/arena/sessions", {});
  const invalidCreateBody = (await invalidCreateResponse.json()) as unknown;
  expectJsonEqual("arena sessions invalid create status", invalidCreateResponse.status, 400);
  expectJsonEqual("arena sessions invalid create body", invalidCreateBody, {
    error: {
      code: "invalid_session_request",
      message: "matchID must be a non-empty string",
      details: {
        path: "matchID",
      },
    },
  });

  const createResponse = await postJson("/arena/sessions", createSessionRequest);
  const createBody = (await createResponse.json()) as unknown;
  expectJsonEqual("arena sessions create status", createResponse.status, 200);
  expectCondition(
    "arena sessions create body object",
    typeof createBody === "object" && createBody !== null,
    { createBody },
  );
  const createdSession = createBody as {
    agents?: unknown;
    currentTick?: unknown;
    matchID?: unknown;
    maxAgents?: unknown;
    sessionID?: unknown;
    status?: unknown;
  };
  expectJsonEqual("arena sessions create id", createdSession.sessionID, createSessionRequest.sessionID);
  expectJsonEqual("arena sessions create match", createdSession.matchID, createSessionRequest.matchID);
  expectJsonEqual("arena sessions create status body", createdSession.status, "waiting");
  expectJsonEqual("arena sessions create current tick", createdSession.currentTick, 0);
  expectJsonEqual("arena sessions create max agents", createdSession.maxAgents, 2);
  expectJsonEqual("arena sessions create agents", createdSession.agents, []);

  const duplicateSessionResponse = await postJson(
    "/arena/sessions",
    createSessionRequest,
  );
  const duplicateSessionBody = (await duplicateSessionResponse.json()) as unknown;
  expectJsonEqual("arena sessions duplicate session status", duplicateSessionResponse.status, 409);
  expectJsonEqual("arena sessions duplicate session body", duplicateSessionBody, {
    error: {
      code: "session_already_exists",
      message: "Arena session already exists",
      details: {
        sessionID: createSessionRequest.sessionID,
      },
    },
  });

  const duplicateMatchResponse = await postJson("/arena/sessions", {
    ...createSessionRequest,
    sessionID: "arena-session-smoke-other",
  });
  const duplicateMatchBody = (await duplicateMatchResponse.json()) as unknown;
  expectJsonEqual("arena sessions duplicate match status", duplicateMatchResponse.status, 409);
  expectJsonEqual("arena sessions duplicate match body", duplicateMatchBody, {
    error: {
      code: "match_already_exists",
      message: "Arena match already exists",
      details: {
        matchID: createSessionRequest.matchID,
      },
    },
  });

  const readCreated = await readJson(`/arena/sessions/${createSessionRequest.sessionID}`);
  expectJsonEqual("arena sessions read created status", readCreated.status, 200);
  expectJsonEqual("arena sessions read created body", readCreated.body, createBody);

  const joinAgentAResponse = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents`,
    {
      clientID: "session-agent-a",
      name: "Session Agent A",
    },
  );
  const joinAgentABody = (await joinAgentAResponse.json()) as unknown;
  expectJsonEqual("arena sessions join agent a status", joinAgentAResponse.status, 200);
  expectCondition(
    "arena sessions join agent a body object",
    typeof joinAgentABody === "object" && joinAgentABody !== null,
    { joinAgentABody },
  );
  const joinedAgentA = joinAgentABody as {
    agent?: {
      clientID?: unknown;
      slotIndex?: unknown;
    };
    clientID?: unknown;
    session?: {
      agents?: unknown;
    };
    status?: unknown;
  };
  expectJsonEqual("arena sessions join agent a client", joinedAgentA.clientID, "session-agent-a");
  expectJsonEqual("arena sessions join agent a status body", joinedAgentA.status, "waiting");
  expectJsonEqual("arena sessions join agent a slot", joinedAgentA.agent?.slotIndex, 0);
  expectCondition(
    "arena sessions join agent a session agents",
    Array.isArray(joinedAgentA.session?.agents) &&
      joinedAgentA.session.agents.length === 1,
    { joinAgentABody },
  );

  const agentAObservation = await readJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/observation`,
  );
  expectJsonEqual("arena sessions agent a observation status", agentAObservation.status, 200);
  expectJsonEqual("arena sessions agent a observation body", agentAObservation.body, {
    sessionID: createSessionRequest.sessionID,
    matchID: createSessionRequest.matchID,
    clientID: "session-agent-a",
    status: "waiting",
    reason: "no_pending_action",
    pendingAction: null,
  });

  const unknownClientObservation = await readJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/unknown-agent/observation`,
  );
  expectJsonEqual(
    "arena sessions unknown client observation status",
    unknownClientObservation.status,
    404,
  );
  expectJsonEqual(
    "arena sessions unknown client observation body",
    unknownClientObservation.body,
    {
      error: {
        code: "client_not_joined",
        message: "Arena session client was not found",
        details: {
          clientID: "unknown-agent",
          sessionID: createSessionRequest.sessionID,
        },
      },
    },
  );

  const missingSessionObservation = await readJson(
    "/arena/sessions/missing-session/agents/session-agent-a/observation",
  );
  expectJsonEqual(
    "arena sessions missing session observation status",
    missingSessionObservation.status,
    404,
  );
  expectJsonEqual(
    "arena sessions missing session observation body",
    missingSessionObservation.body,
    {
      error: {
        code: "session_not_found",
        message: "Arena session was not found",
        details: {
          sessionID: "missing-session",
        },
      },
    },
  );

  const submitWithoutPending = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/actions`,
    {
      turnID: "turn-0001-session-agent-a",
      action: {
        type: "wait",
      },
    },
  );
  const submitWithoutPendingBody = (await submitWithoutPending.json()) as unknown;
  expectJsonEqual(
    "arena sessions submit without pending status",
    submitWithoutPending.status,
    409,
  );
  expectJsonEqual(
    "arena sessions submit without pending body",
    submitWithoutPendingBody,
    {
      error: {
        code: "no_pending_action",
        message: "Arena session action was rejected",
        details: {
          clientID: "session-agent-a",
          sessionID: createSessionRequest.sessionID,
          turnID: "turn-0001-session-agent-a",
        },
      },
    },
  );

  const submittedActionBeforePending = sessionStore.takeSubmittedAction({
    sessionID: createSessionRequest.sessionID,
    clientID: "session-agent-a",
    turnID: "turn-0001-session-agent-a",
  });
  expectJsonEqual(
    "arena sessions submitted action before pending",
    submittedActionBeforePending,
    {
      status: "accepted",
      submittedAction: null,
    },
  );

  const pendingTicket = createArenaSessionPendingObservation({
    now: new Date("2999-05-17T00:00:01.000Z"),
    observation: {
      tick: 1,
      self: {
        clientID: "session-agent-a",
        name: "Session Agent A",
        hasSpawned: true,
        tilesOwned: 12,
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
      ],
    },
    sessionID: createSessionRequest.sessionID,
    store: sessionStore,
    supportedActions: ["wait"],
  });
  expectJsonEqual("arena sessions create pending ticket status", pendingTicket.status, "accepted");

  const agentAPendingObservation = await readJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/observation`,
  );
  expectJsonEqual(
    "arena sessions agent a pending observation status",
    agentAPendingObservation.status,
    200,
  );
  expectJsonEqual("arena sessions agent a pending observation body", agentAPendingObservation.body, {
    sessionID: createSessionRequest.sessionID,
    matchID: createSessionRequest.matchID,
    clientID: "session-agent-a",
    status: "waiting",
    pendingAction: {
      sessionID: createSessionRequest.sessionID,
      matchID: createSessionRequest.matchID,
      clientID: "session-agent-a",
      turnID: "turn-1-session-agent-a",
      tick: 1,
      observation: {
        tick: 1,
        self: {
          clientID: "session-agent-a",
          name: "Session Agent A",
          hasSpawned: true,
          tilesOwned: 12,
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
        ],
      },
      deadlineAt: "2999-05-17T00:00:02.000Z",
      supportedActions: ["wait"],
    },
  });

  const keepPendingAction = sessionStore.expirePendingAction({
    sessionID: createSessionRequest.sessionID,
    clientID: "session-agent-a",
    now: new Date("2999-05-17T00:00:01.500Z"),
  });
  expectJsonEqual("arena sessions keep pending action before deadline", keepPendingAction, {
    status: "accepted",
    expiredTicket: null,
  });

  const submitWrongTurn = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/actions`,
    {
      turnID: "turn-0003-session-agent-a",
      action: {
        type: "wait",
      },
    },
  );
  const submitWrongTurnBody = (await submitWrongTurn.json()) as unknown;
  expectJsonEqual("arena sessions wrong turn submit status", submitWrongTurn.status, 409);
  expectJsonEqual("arena sessions wrong turn submit body", submitWrongTurnBody, {
    error: {
      code: "invalid_turn",
      message: "Arena session action was rejected",
      details: {
        clientID: "session-agent-a",
        sessionID: createSessionRequest.sessionID,
        turnID: "turn-0003-session-agent-a",
      },
    },
  });

  const submitPending = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/actions`,
    {
      turnID: "turn-1-session-agent-a",
      action: {
        type: "wait",
      },
    },
  );
  const submitPendingBody = (await submitPending.json()) as unknown;
  expectJsonEqual("arena sessions submit pending action status", submitPending.status, 200);
  expectJsonEqual("arena sessions submit pending action body", submitPendingBody, {
    sessionID: createSessionRequest.sessionID,
    matchID: createSessionRequest.matchID,
    clientID: "session-agent-a",
    turnID: "turn-1-session-agent-a",
    accepted: true,
    status: "waiting",
  });

  const takeWrongSubmittedAction = sessionStore.takeSubmittedAction({
    sessionID: createSessionRequest.sessionID,
    clientID: "session-agent-a",
    turnID: "turn-0003-session-agent-a",
  });
  expectJsonEqual(
    "arena sessions take wrong submitted action",
    takeWrongSubmittedAction,
    {
      status: "rejected",
      reason: "invalid_turn",
    },
  );

  const takeSubmittedAction = sessionStore.takeSubmittedAction({
    sessionID: createSessionRequest.sessionID,
    clientID: "session-agent-a",
    turnID: "turn-1-session-agent-a",
  });
  expectJsonEqual("arena sessions take submitted action", takeSubmittedAction, {
    status: "accepted",
    submittedAction: {
      sessionID: createSessionRequest.sessionID,
      matchID: createSessionRequest.matchID,
      clientID: "session-agent-a",
      turnID: "turn-1-session-agent-a",
      accepted: true,
      status: "waiting",
      action: {
        type: "wait",
      },
    },
  });

  const takeSubmittedActionAgain = sessionStore.takeSubmittedAction({
    sessionID: createSessionRequest.sessionID,
    clientID: "session-agent-a",
    turnID: "turn-1-session-agent-a",
  });
  expectJsonEqual(
    "arena sessions take submitted action again",
    takeSubmittedActionAgain,
    {
      status: "accepted",
      submittedAction: null,
    },
  );

  const agentAObservationAfterSubmit = await readJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/observation`,
  );
  expectJsonEqual(
    "arena sessions agent a observation after submit status",
    agentAObservationAfterSubmit.status,
    200,
  );
  expectJsonEqual(
    "arena sessions agent a observation after submit body",
    agentAObservationAfterSubmit.body,
    {
      sessionID: createSessionRequest.sessionID,
      matchID: createSessionRequest.matchID,
      clientID: "session-agent-a",
      status: "waiting",
      reason: "no_pending_action",
      pendingAction: null,
    },
  );

  const expiredPendingTicket = createArenaSessionPendingObservation({
    now: new Date("2000-01-01T00:00:00.000Z"),
    observation: {
      tick: 2,
      self: {
        clientID: "session-agent-a",
        name: "Session Agent A",
        hasSpawned: true,
        tilesOwned: 12,
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
      ],
    },
    sessionID: createSessionRequest.sessionID,
    store: sessionStore,
    supportedActions: ["wait"],
  });
  expectJsonEqual(
    "arena sessions create expired pending ticket status",
    expiredPendingTicket.status,
    "accepted",
  );

  const submitExpiredPending = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/actions`,
    {
      turnID: "turn-2-session-agent-a",
      action: {
        type: "wait",
      },
    },
  );
  const submitExpiredPendingBody = (await submitExpiredPending.json()) as unknown;
  expectJsonEqual(
    "arena sessions submit expired pending action status",
    submitExpiredPending.status,
    409,
  );
  expectJsonEqual(
    "arena sessions submit expired pending action body",
    submitExpiredPendingBody,
    {
      error: {
        code: "action_expired",
        message: "Arena session action was rejected",
        details: {
          clientID: "session-agent-a",
          sessionID: createSessionRequest.sessionID,
          turnID: "turn-2-session-agent-a",
        },
      },
    },
  );

  const takeExpiredSubmittedAction = sessionStore.takeSubmittedAction({
    sessionID: createSessionRequest.sessionID,
    clientID: "session-agent-a",
    turnID: "turn-2-session-agent-a",
  });
  expectJsonEqual(
    "arena sessions take expired submitted action",
    takeExpiredSubmittedAction,
    {
      status: "accepted",
      submittedAction: null,
    },
  );

  const expirablePendingTicket = createArenaSessionPendingObservation({
    now: new Date("2000-01-01T00:00:00.000Z"),
    observation: {
      tick: 3,
      self: {
        clientID: "session-agent-a",
        name: "Session Agent A",
        hasSpawned: true,
        tilesOwned: 12,
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
      ],
    },
    sessionID: createSessionRequest.sessionID,
    store: sessionStore,
    supportedActions: ["wait"],
  });
  expectJsonEqual(
    "arena sessions create expirable pending ticket status",
    expirablePendingTicket.status,
    "accepted",
  );

  const expirePendingAction = sessionStore.expirePendingAction({
    sessionID: createSessionRequest.sessionID,
    clientID: "session-agent-a",
    now: new Date("2000-01-01T00:00:02.000Z"),
  });
  expectJsonEqual("arena sessions expire pending action", expirePendingAction, {
    status: "accepted",
    expiredTicket: {
      sessionID: createSessionRequest.sessionID,
      matchID: createSessionRequest.matchID,
      clientID: "session-agent-a",
      turnID: "turn-3-session-agent-a",
      tick: 3,
      observation: {
        tick: 3,
        self: {
          clientID: "session-agent-a",
          name: "Session Agent A",
          hasSpawned: true,
          tilesOwned: 12,
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
        ],
      },
      deadlineAt: "2000-01-01T00:00:01.000Z",
      supportedActions: ["wait"],
    },
  });

  const invalidTurnSubmit = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/actions`,
    {
      turnID: "",
      action: {
        type: "wait",
      },
    },
  );
  const invalidTurnSubmitBody = (await invalidTurnSubmit.json()) as unknown;
  expectJsonEqual("arena sessions invalid turn submit status", invalidTurnSubmit.status, 409);
  expectJsonEqual("arena sessions invalid turn submit body", invalidTurnSubmitBody, {
    error: {
      code: "invalid_turn",
      message: "turnID is invalid",
      details: {
        path: "turnID",
      },
    },
  });

  const invalidActionSubmit = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/session-agent-a/actions`,
    {
      turnID: "turn-0001-session-agent-a",
      action: {
        type: "dance",
      },
    },
  );
  const invalidActionSubmitBody = (await invalidActionSubmit.json()) as unknown;
  expectJsonEqual(
    "arena sessions invalid action submit status",
    invalidActionSubmit.status,
    400,
  );
  expectJsonEqual(
    "arena sessions invalid action submit body",
    invalidActionSubmitBody,
    {
      error: {
        code: "invalid_session_action",
        message: "unknown action type: dance",
        details: {
          path: "action.type",
        },
      },
    },
  );

  const unknownClientSubmit = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents/unknown-agent/actions`,
    {
      turnID: "turn-0001-unknown-agent",
      action: {
        type: "wait",
      },
    },
  );
  const unknownClientSubmitBody = (await unknownClientSubmit.json()) as unknown;
  expectJsonEqual(
    "arena sessions unknown client submit status",
    unknownClientSubmit.status,
    404,
  );
  expectJsonEqual(
    "arena sessions unknown client submit body",
    unknownClientSubmitBody,
    {
      error: {
        code: "client_not_joined",
        message: "Arena session client was not found",
        details: {
          clientID: "unknown-agent",
          sessionID: createSessionRequest.sessionID,
        },
      },
    },
  );

  const missingSessionSubmit = await postJson(
    "/arena/sessions/missing-session/agents/session-agent-a/actions",
    {
      turnID: "turn-0001-session-agent-a",
      action: {
        type: "wait",
      },
    },
  );
  const missingSessionSubmitBody = (await missingSessionSubmit.json()) as unknown;
  expectJsonEqual(
    "arena sessions missing session submit status",
    missingSessionSubmit.status,
    404,
  );
  expectJsonEqual(
    "arena sessions missing session submit body",
    missingSessionSubmitBody,
    {
      error: {
        code: "session_not_found",
        message: "Arena session was not found",
        details: {
          sessionID: "missing-session",
        },
      },
    },
  );

  const duplicateAgentResponse = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents`,
    {
      clientID: "session-agent-a",
      name: "Session Agent A",
    },
  );
  const duplicateAgentBody = (await duplicateAgentResponse.json()) as unknown;
  expectJsonEqual("arena sessions duplicate agent status", duplicateAgentResponse.status, 409);
  expectJsonEqual("arena sessions duplicate agent body", duplicateAgentBody, {
    error: {
      code: "client_already_joined",
      message: "Arena session join was rejected",
      details: {
        sessionID: createSessionRequest.sessionID,
        clientID: "session-agent-a",
      },
    },
  });

  const joinAgentBResponse = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents`,
    {
      clientID: "session-agent-b",
      name: "Session Agent B",
    },
  );
  const joinAgentBBody = (await joinAgentBResponse.json()) as {
    agent?: {
      slotIndex?: unknown;
    };
    session?: {
      agents?: unknown;
    };
  };
  expectJsonEqual("arena sessions join agent b status", joinAgentBResponse.status, 200);
  expectJsonEqual("arena sessions join agent b slot", joinAgentBBody.agent?.slotIndex, 1);
  expectCondition(
    "arena sessions join agent b session agents",
    Array.isArray(joinAgentBBody.session?.agents) &&
      joinAgentBBody.session.agents.length === 2,
    { joinAgentBBody },
  );

  const fullSessionResponse = await postJson(
    `/arena/sessions/${createSessionRequest.sessionID}/agents`,
    {
      clientID: "session-agent-c",
      name: "Session Agent C",
    },
  );
  const fullSessionBody = (await fullSessionResponse.json()) as unknown;
  expectJsonEqual("arena sessions full status", fullSessionResponse.status, 409);
  expectJsonEqual("arena sessions full body", fullSessionBody, {
    error: {
      code: "session_full",
      message: "Arena session join was rejected",
      details: {
        sessionID: createSessionRequest.sessionID,
        clientID: "session-agent-c",
      },
    },
  });

  const missingSession = await readJson("/arena/sessions/missing-session");
  expectJsonEqual("arena sessions missing status", missingSession.status, 404);
  expectJsonEqual("arena sessions missing body", missingSession.body, {
    error: {
      code: "session_not_found",
      message: "Arena session was not found",
      details: {
        sessionID: "missing-session",
      },
    },
  });

  const listAfterJoin = await readJson("/arena/sessions");
  expectJsonEqual("arena sessions list after join status", listAfterJoin.status, 200);
  expectCondition(
    "arena sessions list after join body",
    typeof listAfterJoin.body === "object" &&
      listAfterJoin.body !== null &&
      "sessions" in listAfterJoin.body &&
      Array.isArray(listAfterJoin.body.sessions) &&
      listAfterJoin.body.sessions.length === 1,
    { listAfterJoin },
  );

  console.log("OpenFront Agent Arena API server sessions smoke check passed.");
  console.log(
    JSON.stringify(
      {
        sessionID: createSessionRequest.sessionID,
        matchID: createSessionRequest.matchID,
        checkedRoutes: [
          "GET /arena/sessions",
          "POST /arena/sessions",
          "GET /arena/sessions/:sessionID",
          "POST /arena/sessions/:sessionID/agents",
          "GET /arena/sessions/:sessionID/agents/:clientID/observation",
          "POST /arena/sessions/:sessionID/agents/:clientID/actions",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
