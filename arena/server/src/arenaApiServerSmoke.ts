import { startArenaApiServer } from "./arenaApiServer";
import { startHttpExampleAgentServer } from "../../agents/httpExampleAgent";
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
          "POST /arena/matches invalid request",
          "POST /arena/matches remote endpoint rejection",
          "POST /arena/matches completed match",
          "GET /arena/matches/:matchID",
          "GET /arena/matches/:matchID/result",
          "GET /arena/matches/:matchID/replay",
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
