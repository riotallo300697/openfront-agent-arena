import http from "node:http";
import { startArenaApiServer } from "./arenaApiServer";
import { startHttpExampleAgentServer } from "../../agents/httpExampleAgent";
import { readReplayEvents } from "../../runner/src/replayReader";
import { validateReplayFileSemantics } from "../../runner/src/replaySemanticValidation";
import { expectCondition, expectJsonEqual } from "../../runner/src/smokeAssert";

const server = await startArenaApiServer();
const agentA = await startHttpExampleAgentServer({
  spawn: {
    x: 10,
    y: 10,
  },
});
const agentB = await startHttpExampleAgentServer({
  spawn: {
    x: 80,
    y: 80,
  },
});

const validMatchRequest = {
  matchID: "arena-api-validation-smoke",
  map: "tests/testdata/maps/plains",
  maxTicks: 12,
  agentDecisionTimeoutMs: 1000,
  agents: [
    {
      clientID: "arena-api-agent-a",
      name: "ArenaApiAgentA",
      endpoint: `${agentA.url}/decide`,
      spawn: {
        x: 10,
        y: 10,
      },
    },
    {
      clientID: "arena-api-agent-b",
      name: "ArenaApiAgentB",
      endpoint: `${agentB.url}/decide`,
      spawn: {
        x: 30,
        y: 30,
      },
    },
  ],
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

async function postRaw(path: string, body: string): Promise<Response> {
  return fetch(`${server.url}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
  });
}

async function closedLocalDecideEndpoint(): Promise<string> {
  const closedServer = http.createServer((_request, response) => {
    response.writeHead(503);
    response.end();
  });

  await new Promise<void>((resolve) => {
    closedServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = closedServer.address();
  expectCondition(
    "arena api closed endpoint address",
    typeof address === "object" &&
      address !== null &&
      typeof address.port === "number",
    { address },
  );
  const port =
    typeof address === "object" && address !== null ? address.port : 0;

  await new Promise<void>((resolve, reject) => {
    closedServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  return `http://127.0.0.1:${port}/decide`;
}

try {
  const healthResponse = await fetch(`${server.url}/arena/health`);
  const healthBody = (await healthResponse.json()) as unknown;

  expectCondition("arena api health status", healthResponse.status === 200, {
    status: healthResponse.status,
    body: healthBody,
  });
  expectJsonEqual("arena api health body", healthBody, {
    ok: true,
    service: "openfront-agent-arena",
    mode: "local",
  });

  const missingResponse = await fetch(`${server.url}/arena/missing`);
  const missingBody = (await missingResponse.json()) as unknown;

  expectCondition("arena api missing route status", missingResponse.status === 404, {
    status: missingResponse.status,
    body: missingBody,
  });
  expectJsonEqual("arena api missing route body", missingBody, {
    error: {
      code: "not_found",
      message: "Arena API route was not found",
      details: {
        method: "GET",
        url: "/arena/missing",
      },
    },
  });

  const healthMethodResponse = await fetch(`${server.url}/arena/health`, {
    method: "POST",
  });
  const healthMethodBody = (await healthMethodResponse.json()) as unknown;

  expectCondition(
    "arena api health method status",
    healthMethodResponse.status === 405,
    {
      status: healthMethodResponse.status,
      body: healthMethodBody,
    },
  );
  expectJsonEqual("arena api health method body", healthMethodBody, {
    error: {
      code: "method_not_allowed",
      message: "GET /arena/health is the only supported health request",
      details: {
        method: "POST",
      },
    },
  });

  const emptyMatchesResponse = await fetch(`${server.url}/arena/matches`);
  const emptyMatchesBody = (await emptyMatchesResponse.json()) as unknown;

  expectCondition(
    "arena api empty matches status",
    emptyMatchesResponse.status === 200,
    {
      status: emptyMatchesResponse.status,
      body: emptyMatchesBody,
    },
  );
  expectJsonEqual("arena api empty matches body", emptyMatchesBody, {
    matches: [],
  });

  const matchesMethodResponse = await fetch(`${server.url}/arena/matches`, {
    method: "PUT",
  });
  const matchesMethodBody = (await matchesMethodResponse.json()) as unknown;

  expectCondition(
    "arena api matches method status",
    matchesMethodResponse.status === 405,
    {
      status: matchesMethodResponse.status,
      body: matchesMethodBody,
    },
  );
  expectJsonEqual("arena api matches method body", matchesMethodBody, {
    error: {
      code: "method_not_allowed",
      message: "GET or POST /arena/matches is required",
      details: {
        method: "PUT",
      },
    },
  });

  const invalidJsonResponse = await postRaw("/arena/matches", "{");
  const invalidJsonBody = (await invalidJsonResponse.json()) as {
    error?: {
      code?: unknown;
      message?: unknown;
      details?: {
        reason?: unknown;
      };
    };
  };

  expectCondition(
    "arena api invalid json status",
    invalidJsonResponse.status === 400,
    {
      status: invalidJsonResponse.status,
      body: invalidJsonBody,
    },
  );
  expectJsonEqual("arena api invalid json code", invalidJsonBody.error?.code, "invalid_json");
  expectJsonEqual(
    "arena api invalid json message",
    invalidJsonBody.error?.message,
    "request body must be valid JSON",
  );
  expectCondition(
    "arena api invalid json reason",
    typeof invalidJsonBody.error?.details?.reason === "string",
    { body: invalidJsonBody },
  );

  const oversizedBodyResponse = await postRaw(
    "/arena/matches",
    " ".repeat(64 * 1024 + 1),
  );
  const oversizedBody = (await oversizedBodyResponse.json()) as unknown;

  expectCondition(
    "arena api oversized body status",
    oversizedBodyResponse.status === 413,
    {
      status: oversizedBodyResponse.status,
      body: oversizedBody,
    },
  );
  expectJsonEqual("arena api oversized body", oversizedBody, {
    error: {
      code: "request_body_too_large",
      message: "request body is too large",
      details: {
        maxBytes: 64 * 1024,
      },
    },
  });

  const invalidMatchResponse = await postJson("/arena/matches", {});
  const invalidMatchBody = (await invalidMatchResponse.json()) as unknown;

  expectCondition(
    "arena api invalid match status",
    invalidMatchResponse.status === 400,
    {
      status: invalidMatchResponse.status,
      body: invalidMatchBody,
    },
  );
  expectJsonEqual("arena api invalid match body", invalidMatchBody, {
    error: {
      code: "invalid_match_request",
      message: "matchID must be a non-empty string",
      details: {
        path: "matchID",
      },
    },
  });

  const remoteEndpointResponse = await postJson("/arena/matches", {
    ...validMatchRequest,
    agents: [
      {
        ...validMatchRequest.agents[0],
        endpoint: "https://example.com/decide",
      },
      validMatchRequest.agents[1],
    ],
  });
  const remoteEndpointBody = (await remoteEndpointResponse.json()) as unknown;

  expectCondition(
    "arena api remote endpoint rejection status",
    remoteEndpointResponse.status === 400,
    {
      status: remoteEndpointResponse.status,
      body: remoteEndpointBody,
    },
  );
  expectJsonEqual("arena api remote endpoint rejection body", remoteEndpointBody, {
    error: {
      code: "invalid_match_request",
      message: "endpoint must be a localhost HTTP /decide URL",
      details: {
        path: "agents[0].endpoint",
      },
    },
  });

  const validMatchResponse = await postJson("/arena/matches", validMatchRequest);
  const validMatchBody = (await validMatchResponse.json()) as unknown;

  expectCondition(
    "arena api valid match status",
    validMatchResponse.status === 200,
    {
      status: validMatchResponse.status,
      body: validMatchBody,
    },
  );
  expectCondition(
    "arena api valid match response object",
    typeof validMatchBody === "object" && validMatchBody !== null,
    { body: validMatchBody },
  );
  const validMatchRecord = validMatchBody as {
    matchID?: unknown;
    status?: unknown;
    createdAt?: unknown;
    completedAt?: unknown;
    replay?: {
      format?: unknown;
      path?: unknown;
    };
    result?: {
      ticks?: unknown;
      rejectedActions?: unknown;
      replay?: unknown;
      agents?: unknown;
    };
  };
  expectJsonEqual("arena api valid match id", validMatchRecord.matchID, validMatchRequest.matchID);
  expectJsonEqual("arena api valid match status body", validMatchRecord.status, "completed");
  expectCondition("arena api valid match created at", typeof validMatchRecord.createdAt === "string", {
    body: validMatchBody,
  });
  expectCondition("arena api valid match completed at", typeof validMatchRecord.completedAt === "string", {
    body: validMatchBody,
  });
  expectJsonEqual("arena api valid match ticks", validMatchRecord.result?.ticks, validMatchRequest.maxTicks);
  expectJsonEqual("arena api valid match rejected actions", validMatchRecord.result?.rejectedActions, 0);
  expectCondition("arena api valid match replay path", typeof validMatchRecord.result?.replay === "string", {
    result: validMatchRecord.result,
  });
  expectJsonEqual("arena api valid match replay metadata", validMatchRecord.replay, {
    format: "openfront-agent-arena-jsonl",
    path: validMatchRecord.result?.replay,
  });
  expectCondition("arena api valid match final agents", Array.isArray(validMatchRecord.result?.agents), {
    result: validMatchRecord.result,
  });

  const replayCheck = validateReplayFileSemantics(
    validMatchRecord.result?.replay as string,
    {
      matchID: validMatchRequest.matchID,
      runner: "api-http",
      map: validMatchRequest.map,
      maxTicks: validMatchRequest.maxTicks,
      agentDecisionTimeoutMs: validMatchRequest.agentDecisionTimeoutMs,
      agents: validMatchRequest.agents.map((agent) => ({
        name: agent.name,
        clientID: agent.clientID,
      })),
      supportedActions: ["spawn", "wait", "attack"],
      finalAgents: validMatchRequest.agents.map((agent) => ({
        agent: agent.name,
        clientID: agent.clientID,
      })),
      expectedRejectedActions: 0,
      expectedDecisionsPerTick: validMatchRequest.agents.length,
    },
  );

  const duplicateMatchResponse = await postJson(
    "/arena/matches",
    validMatchRequest,
  );
  const duplicateMatchBody = (await duplicateMatchResponse.json()) as unknown;

  expectCondition(
    "arena api duplicate match status",
    duplicateMatchResponse.status === 409,
    {
      status: duplicateMatchResponse.status,
      body: duplicateMatchBody,
    },
  );
  expectJsonEqual("arena api duplicate match body", duplicateMatchBody, {
    error: {
      code: "match_already_exists",
      message: "Arena match already exists",
      details: {
        matchID: validMatchRequest.matchID,
      },
    },
  });

  const unreachableEndpoint = await closedLocalDecideEndpoint();
  const unreachableMatchRequest = {
    ...validMatchRequest,
    matchID: "arena-api-unreachable-agent-smoke",
    maxTicks: 2,
    agentDecisionTimeoutMs: 100,
    agents: validMatchRequest.agents.map((agent) => ({
      ...agent,
      endpoint: unreachableEndpoint,
    })),
  };
  const unreachableMatchResponse = await postJson(
    "/arena/matches",
    unreachableMatchRequest,
  );
  const unreachableMatchBody = (await unreachableMatchResponse.json()) as unknown;

  expectCondition(
    "arena api unreachable agent match status",
    unreachableMatchResponse.status === 200,
    {
      status: unreachableMatchResponse.status,
      body: unreachableMatchBody,
    },
  );
  expectCondition(
    "arena api unreachable agent match response object",
    typeof unreachableMatchBody === "object" && unreachableMatchBody !== null,
    { body: unreachableMatchBody },
  );
  const unreachableMatchRecord = unreachableMatchBody as {
    matchID?: unknown;
    status?: unknown;
    result?: {
      ticks?: unknown;
      rejectedActions?: unknown;
      attackIntents?: unknown;
      replay?: unknown;
    };
  };
  expectJsonEqual(
    "arena api unreachable agent match id",
    unreachableMatchRecord.matchID,
    unreachableMatchRequest.matchID,
  );
  expectJsonEqual(
    "arena api unreachable agent match status body",
    unreachableMatchRecord.status,
    "completed",
  );
  expectJsonEqual(
    "arena api unreachable agent match ticks",
    unreachableMatchRecord.result?.ticks,
    unreachableMatchRequest.maxTicks,
  );
  expectJsonEqual(
    "arena api unreachable agent rejected actions",
    unreachableMatchRecord.result?.rejectedActions,
    unreachableMatchRequest.maxTicks * unreachableMatchRequest.agents.length,
  );
  expectJsonEqual(
    "arena api unreachable agent attack intents",
    unreachableMatchRecord.result?.attackIntents,
    0,
  );
  expectCondition(
    "arena api unreachable agent replay path",
    typeof unreachableMatchRecord.result?.replay === "string",
    { result: unreachableMatchRecord.result },
  );
  const unreachableReplayEvents = readReplayEvents(
    unreachableMatchRecord.result?.replay as string,
  );
  const unreachableTickEvents = unreachableReplayEvents.filter(
    (event) => event.type === "tick",
  );
  expectJsonEqual(
    "arena api unreachable agent replay tick count",
    unreachableTickEvents.length,
    unreachableMatchRequest.maxTicks,
  );
  for (const tickEvent of unreachableTickEvents) {
    expectJsonEqual(
      "arena api unreachable agent replay decision count",
      tickEvent.decisions.length,
      unreachableMatchRequest.agents.length,
    );
    for (const decision of tickEvent.decisions) {
      expectJsonEqual(
        "arena api unreachable agent replay input status",
        decision.inputValidation.status,
        "rejected",
      );
      expectJsonEqual(
        "arena api unreachable agent replay input path",
        decision.inputValidation.status === "rejected"
          ? decision.inputValidation.path
          : null,
        "agent.decide",
      );
      expectJsonEqual(
        "arena api unreachable agent replay intent",
        decision.intent,
        null,
      );
    }
  }

  const listMatchesResponse = await fetch(`${server.url}/arena/matches`);
  const listMatchesBody = (await listMatchesResponse.json()) as {
    matches?: unknown;
  };

  expectCondition(
    "arena api list matches status",
    listMatchesResponse.status === 200,
    {
      status: listMatchesResponse.status,
      body: listMatchesBody,
    },
  );
  expectCondition(
    "arena api list matches body",
    Array.isArray(listMatchesBody.matches),
    { body: listMatchesBody },
  );
  expectJsonEqual(
    "arena api list matches ids",
    Array.isArray(listMatchesBody.matches)
      ? listMatchesBody.matches.map((match) =>
          typeof match === "object" && match !== null && "matchID" in match
            ? match.matchID
            : null,
        )
      : [],
    [validMatchRequest.matchID, unreachableMatchRequest.matchID],
  );

  const readMatchResponse = await fetch(
    `${server.url}/arena/matches/${validMatchRequest.matchID}`,
  );
  const readMatchBody = (await readMatchResponse.json()) as unknown;

  expectCondition("arena api read match status", readMatchResponse.status === 200, {
    status: readMatchResponse.status,
    body: readMatchBody,
  });
  expectJsonEqual("arena api read match body", readMatchBody, validMatchBody);

  const readResultResponse = await fetch(
    `${server.url}/arena/matches/${validMatchRequest.matchID}/result`,
  );
  const readResultBody = (await readResultResponse.json()) as unknown;

  expectCondition("arena api read result status", readResultResponse.status === 200, {
    status: readResultResponse.status,
    body: readResultBody,
  });
  expectJsonEqual("arena api read result body", readResultBody, validMatchRecord.result);

  const readReplayResponse = await fetch(
    `${server.url}/arena/matches/${validMatchRequest.matchID}/replay`,
  );
  const readReplayBody = (await readReplayResponse.json()) as unknown;

  expectCondition("arena api read replay status", readReplayResponse.status === 200, {
    status: readReplayResponse.status,
    body: readReplayBody,
  });
  expectJsonEqual("arena api read replay body", readReplayBody, {
    matchID: validMatchRequest.matchID,
    format: "openfront-agent-arena-jsonl",
    path: validMatchRecord.result?.replay,
  });

  const readMatchMethodResponse = await fetch(
    `${server.url}/arena/matches/${validMatchRequest.matchID}`,
    {
      method: "POST",
    },
  );
  const readMatchMethodBody = (await readMatchMethodResponse.json()) as unknown;

  expectCondition(
    "arena api read match method status",
    readMatchMethodResponse.status === 405,
    {
      status: readMatchMethodResponse.status,
      body: readMatchMethodBody,
    },
  );
  expectJsonEqual("arena api read match method body", readMatchMethodBody, {
    error: {
      code: "method_not_allowed",
      message: "GET is required to read Arena match records",
      details: {
        method: "POST",
      },
    },
  });

  const missingMatchResponse = await fetch(
    `${server.url}/arena/matches/not-found-match`,
  );
  const missingMatchBody = (await missingMatchResponse.json()) as unknown;

  expectCondition("arena api missing match status", missingMatchResponse.status === 404, {
    status: missingMatchResponse.status,
    body: missingMatchBody,
  });
  expectJsonEqual("arena api missing match body", missingMatchBody, {
    error: {
      code: "match_not_found",
      message: "Arena match was not found",
      details: {
        matchID: "not-found-match",
      },
    },
  });

  console.log("OpenFront Agent Arena API server smoke check passed.");
  console.log(
    JSON.stringify(
      {
        url: server.url,
        checkedRoutes: [
          "GET /arena/health",
          "GET /arena/missing",
          "POST /arena/health method rejection",
          "GET /arena/matches empty list",
          "PUT /arena/matches method rejection",
          "POST /arena/matches invalid JSON",
          "POST /arena/matches oversized body",
          "POST /arena/matches invalid request",
          "POST /arena/matches remote endpoint rejection",
          "POST /arena/matches completed match",
          "POST /arena/matches duplicate matchID",
          "POST /arena/matches unreachable agents",
          "GET /arena/matches list",
          "GET /arena/matches/:matchID",
          "GET /arena/matches/:matchID/result",
          "GET /arena/matches/:matchID/replay",
          "POST /arena/matches/:matchID method rejection",
        ],
        replayEvents: replayCheck.events.length,
      },
      null,
      2,
    ),
  );
} finally {
  await agentB.close();
  await agentA.close();
  await server.close();
}
