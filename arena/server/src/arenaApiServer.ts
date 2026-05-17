import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import type { ArenaApiEvent } from "./arenaApiEvents";
import { runArenaHttpMatch } from "./arenaHttpMatchRunner";
import {
  createInMemoryArenaMatchStore,
  createJsonlArenaMatchStore,
  type ArenaMatchRecord,
  type ArenaMatchStore,
} from "./arenaMatchStore";
import { createPostgresArenaMatchStore } from "./arenaPostgresMatchStore";
import { validateArenaMatchRequest } from "./arenaMatchRequestValidation";
import {
  createInMemoryArenaSessionStore,
  type ArenaSessionStore,
} from "./arenaSessionStore";
import {
  validateArenaSessionCreateRequest,
  validateArenaSessionJoinRequest,
  validateArenaSessionSubmitActionRequest,
} from "./arenaSessionValidation";
import { repoRoot } from "../../runner/src/headless";

export type ArenaApiServer = {
  readonly url: string;
  close(): Promise<void>;
};

export type ArenaApiServerOptions = {
  host?: string;
  matchStore?: ArenaMatchStore;
  port?: number;
  sessionStore?: ArenaSessionStore;
};

const healthResponse = {
  ok: true,
  service: "openfront-agent-arena",
  mode: "local",
} as const;

const maxRequestBodyBytes = 64 * 1024;

class RequestBodyTooLargeError extends Error {
  readonly maxBytes: number;

  constructor(maxBytes: number) {
    super(`request body exceeds ${maxBytes} bytes`);
    this.maxBytes = maxBytes;
  }
}

type ArenaApiState = {
  matches: Map<string, ArenaMatchRecord>;
  matchStore: ArenaMatchStore;
  reservedMatchIDs: Set<string>;
  sessionStore: ArenaSessionStore;
  eventClients: Set<WebSocket>;
};

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json",
  });
  response.end(JSON.stringify(body));
}

function sendError(
  response: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) {
  sendJson(response, statusCode, {
    error: {
      code,
      message,
      details,
    },
  });
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;

    request.on("data", (chunk: Buffer) => {
      if (settled) {
        return;
      }

      bytes += chunk.length;

      if (bytes > maxRequestBodyBytes) {
        settled = true;
        chunks.length = 0;
        request.resume();
        reject(new RequestBodyTooLargeError(maxRequestBodyBytes));
        return;
      }

      chunks.push(chunk);
    });
    request.on("end", () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serverPort(server: http.Server): number {
  const address = server.address();

  if (!isRecord(address) || typeof address.port !== "number") {
    throw new Error("Arena API server did not expose a port");
  }

  return address.port;
}

function broadcastEvent(state: ArenaApiState, event: ArenaApiEvent) {
  const message = JSON.stringify(event);

  for (const client of state.eventClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

async function handleCreateMatch(
  request: IncomingMessage,
  response: ServerResponse,
  state: ArenaApiState,
) {
  if (request.method !== "POST") {
    sendError(
      response,
      405,
      "method_not_allowed",
      "POST /arena/matches is required to validate a match request",
      { method: request.method },
    );
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(await readRequestBody(request)) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      sendError(
        response,
        413,
        "request_body_too_large",
        "request body is too large",
        {
          maxBytes: error.maxBytes,
        },
      );
      return;
    }

    sendError(response, 400, "invalid_json", "request body must be valid JSON", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const validation = validateArenaMatchRequest(body);
  if (validation.status === "rejected") {
    sendError(
      response,
      400,
      validation.error.code,
      validation.error.message,
      validation.error.details,
    );
    return;
  }

  if (
    state.matches.has(validation.request.matchID) ||
    state.reservedMatchIDs.has(validation.request.matchID)
  ) {
    sendError(
      response,
      409,
      "match_already_exists",
      "Arena match already exists",
      {
        matchID: validation.request.matchID,
      },
    );
    return;
  }

  state.reservedMatchIDs.add(validation.request.matchID);
  const createdAt = new Date().toISOString();
  try {
    const result = await runArenaHttpMatch(validation.request, {
      emitEvent: (event) => broadcastEvent(state, event),
    });
    const completedAt = new Date().toISOString();
    const record: ArenaMatchRecord = {
      matchID: validation.request.matchID,
      status: "completed",
      createdAt,
      completedAt,
      map: validation.request.map,
      maxTicks: validation.request.maxTicks,
      agentDecisionTimeoutMs: validation.request.agentDecisionTimeoutMs,
      runner: "api-http",
      agents: validation.request.agents.map((agent) => ({
        clientID: agent.clientID,
        name: agent.name,
        endpoint: agent.endpoint,
        spawn: {
          x: agent.spawn.x,
          y: agent.spawn.y,
        },
      })),
      result,
      replay: {
        format: "openfront-agent-arena-jsonl",
        path: result.replay,
      },
    };

    await state.matchStore.saveMatch(record);
    state.matches.set(record.matchID, record);

    sendJson(response, 200, record);
  } finally {
    state.reservedMatchIDs.delete(validation.request.matchID);
  }
}

function handleListMatches(response: ServerResponse, state: ArenaApiState) {
  sendJson(response, 200, {
    matches: Array.from(state.matches.values()),
  });
}

async function handleCreateSession(
  request: IncomingMessage,
  response: ServerResponse,
  state: ArenaApiState,
) {
  if (request.method !== "POST") {
    sendError(
      response,
      405,
      "method_not_allowed",
      "POST /arena/sessions is required to create a session",
      { method: request.method },
    );
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(await readRequestBody(request)) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      sendError(
        response,
        413,
        "request_body_too_large",
        "request body is too large",
        {
          maxBytes: error.maxBytes,
        },
      );
      return;
    }

    sendError(response, 400, "invalid_json", "request body must be valid JSON", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const validation = validateArenaSessionCreateRequest(body);
  if (validation.status === "rejected") {
    sendError(
      response,
      400,
      validation.error.code,
      validation.error.message,
      validation.error.details,
    );
    return;
  }

  const requestedSessionID = validation.request.sessionID;
  if (
    requestedSessionID !== undefined &&
    state.sessionStore.sessionIDExists(requestedSessionID)
  ) {
    sendError(response, 409, "session_already_exists", "Arena session already exists", {
      sessionID: requestedSessionID,
    });
    return;
  }

  if (
    state.matches.has(validation.request.matchID) ||
    state.reservedMatchIDs.has(validation.request.matchID) ||
    state.sessionStore.matchIDExists(validation.request.matchID)
  ) {
    sendError(response, 409, "match_already_exists", "Arena match already exists", {
      matchID: validation.request.matchID,
    });
    return;
  }

  sendJson(response, 200, state.sessionStore.createSession(validation.request));
}

function handleListSessions(response: ServerResponse, state: ArenaApiState) {
  sendJson(response, 200, {
    sessions: state.sessionStore.listSessions(),
  });
}

function sessionPath(url: string | undefined):
  | {
      kind: "session" | "agents";
      sessionID: string;
    }
  | {
      clientID: string;
      kind: "action" | "observation";
      sessionID: string;
    }
  | null {
  const observationMatch = (url ?? "").match(
    /^\/arena\/sessions\/([A-Za-z0-9_-]+)\/agents\/([A-Za-z0-9_-]+)\/observation$/,
  );
  if (observationMatch !== null) {
    return {
      clientID: observationMatch[2],
      kind: "observation",
      sessionID: observationMatch[1],
    };
  }

  const actionMatch = (url ?? "").match(
    /^\/arena\/sessions\/([A-Za-z0-9_-]+)\/agents\/([A-Za-z0-9_-]+)\/actions$/,
  );
  if (actionMatch !== null) {
    return {
      clientID: actionMatch[2],
      kind: "action",
      sessionID: actionMatch[1],
    };
  }

  const match = (url ?? "").match(
    /^\/arena\/sessions\/([A-Za-z0-9_-]+)(?:\/(agents))?$/,
  );

  if (match === null) {
    return null;
  }

  return {
    kind: match[2] === "agents" ? "agents" : "session",
    sessionID: match[1],
  };
}

function sendSessionNotFound(response: ServerResponse, sessionID: string) {
  sendError(response, 404, "session_not_found", "Arena session was not found", {
    sessionID,
  });
}

function sendSessionClientNotFound(
  response: ServerResponse,
  sessionID: string,
  clientID: string,
) {
  sendError(
    response,
    404,
    "client_not_joined",
    "Arena session client was not found",
    {
      clientID,
      sessionID,
    },
  );
}

async function handleSessionRoute(
  request: IncomingMessage,
  response: ServerResponse,
  state: ArenaApiState,
): Promise<boolean> {
  const route = sessionPath(request.url);
  if (route === null) {
    return false;
  }

  const session = state.sessionStore.getSession(route.sessionID);
  if (route.kind === "action") {
    if (request.method !== "POST") {
      sendError(
        response,
        405,
        "method_not_allowed",
        "POST /arena/sessions/:sessionID/agents/:clientID/actions is required",
        { method: request.method },
      );
      return true;
    }

    let body: unknown;
    try {
      body = JSON.parse(await readRequestBody(request)) as unknown;
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        sendError(
          response,
          413,
          "request_body_too_large",
          "request body is too large",
          {
            maxBytes: error.maxBytes,
          },
        );
        return true;
      }

      sendError(response, 400, "invalid_json", "request body must be valid JSON", {
        reason: error instanceof Error ? error.message : String(error),
      });
      return true;
    }

    const validation = validateArenaSessionSubmitActionRequest(body);
    if (validation.status === "rejected") {
      const statusCode = validation.error.code === "invalid_turn" ? 409 : 400;
      sendError(
        response,
        statusCode,
        validation.error.code,
        validation.error.message,
        validation.error.details,
      );
      return true;
    }

    const submitted = state.sessionStore.submitAction({
      clientID: route.clientID,
      request: validation.request,
      sessionID: route.sessionID,
    });

    if (submitted.status === "rejected") {
      if (submitted.reason === "session_not_found") {
        sendSessionNotFound(response, route.sessionID);
        return true;
      }

      if (submitted.reason === "client_not_joined") {
        sendSessionClientNotFound(response, route.sessionID, route.clientID);
        return true;
      }

      sendError(
        response,
        409,
        submitted.reason,
        "Arena session action was rejected",
        {
          clientID: route.clientID,
          sessionID: route.sessionID,
          turnID: validation.request.turnID,
        },
      );
      return true;
    }

    sendJson(response, 200, submitted.submission);
    return true;
  }

  if (route.kind === "observation") {
    if (request.method !== "GET") {
      sendError(
        response,
        405,
        "method_not_allowed",
        "GET /arena/sessions/:sessionID/agents/:clientID/observation is required",
        { method: request.method },
      );
      return true;
    }

    const observationState = state.sessionStore.getObservationState({
      clientID: route.clientID,
      sessionID: route.sessionID,
    });
    if (observationState.status === "rejected") {
      if (observationState.reason === "session_not_found") {
        sendSessionNotFound(response, route.sessionID);
        return true;
      }

      sendSessionClientNotFound(response, route.sessionID, route.clientID);
      return true;
    }

    sendJson(response, 200, observationState.observationState);
    return true;
  }

  if (route.kind === "session") {
    if (request.method !== "GET") {
      sendError(
        response,
        405,
        "method_not_allowed",
        "GET /arena/sessions/:sessionID is required",
        { method: request.method },
      );
      return true;
    }

    if (session === null) {
      sendSessionNotFound(response, route.sessionID);
      return true;
    }

    sendJson(response, 200, session);
    return true;
  }

  if (request.method !== "POST") {
    sendError(
      response,
      405,
      "method_not_allowed",
      "POST /arena/sessions/:sessionID/agents is required",
      { method: request.method },
    );
    return true;
  }

  let body: unknown;
  try {
    body = JSON.parse(await readRequestBody(request)) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      sendError(
        response,
        413,
        "request_body_too_large",
        "request body is too large",
        {
          maxBytes: error.maxBytes,
        },
      );
      return true;
    }

    sendError(response, 400, "invalid_json", "request body must be valid JSON", {
      reason: error instanceof Error ? error.message : String(error),
    });
    return true;
  }

  const validation = validateArenaSessionJoinRequest(body);
  if (validation.status === "rejected") {
    sendError(
      response,
      400,
      validation.error.code,
      validation.error.message,
      validation.error.details,
    );
    return true;
  }

  const joined = state.sessionStore.joinSession({
    clientID: validation.request.clientID,
    name: validation.request.name,
    now: new Date().toISOString(),
    sessionID: route.sessionID,
  });

  if (joined.status === "rejected") {
    if (joined.reason === "session_not_found") {
      sendSessionNotFound(response, route.sessionID);
      return true;
    }

    sendError(response, 409, joined.reason, "Arena session join was rejected", {
      sessionID: route.sessionID,
      clientID: validation.request.clientID,
    });
    return true;
  }

  sendJson(response, 200, {
    sessionID: joined.session.sessionID,
    matchID: joined.session.matchID,
    clientID: joined.agent.clientID,
    status: joined.session.status,
    agent: joined.agent,
    session: joined.session,
  });
  return true;
}

function matchPath(url: string | undefined):
  | {
      kind: "match" | "result" | "replay";
      matchID: string;
    }
  | null {
  const match = (url ?? "").match(
    /^\/arena\/matches\/([A-Za-z0-9_-]+)(?:\/(result|replay))?$/,
  );

  if (match === null) {
    return null;
  }

  return {
    kind:
      match[2] === "result" || match[2] === "replay" ? match[2] : "match",
    matchID: match[1],
  };
}

function handleReadMatch(
  request: IncomingMessage,
  response: ServerResponse,
  state: ArenaApiState,
) {
  const route = matchPath(request.url);
  if (route === null) {
    return false;
  }

  if (request.method !== "GET") {
    sendError(
      response,
      405,
      "method_not_allowed",
      "GET is required to read Arena match records",
      { method: request.method },
    );
    return true;
  }

  const record = state.matches.get(route.matchID);
  if (record === undefined) {
    sendError(response, 404, "match_not_found", "Arena match was not found", {
      matchID: route.matchID,
    });
    return true;
  }

  if (route.kind === "result") {
    sendJson(response, 200, record.result);
    return true;
  }

  if (route.kind === "replay") {
    sendJson(response, 200, {
      matchID: record.matchID,
      ...record.replay,
    });
    return true;
  }

  sendJson(response, 200, record);
  return true;
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  state: ArenaApiState,
) {
  if (request.url === "/arena/health") {
    if (request.method !== "GET") {
      sendError(
        response,
        405,
        "method_not_allowed",
        "GET /arena/health is the only supported health request",
        { method: request.method },
      );
      return;
    }

    sendJson(response, 200, healthResponse);
    return;
  }

  if (request.url === "/arena/matches") {
    if (request.method === "GET") {
      handleListMatches(response, state);
      return;
    }

    if (request.method === "POST") {
      await handleCreateMatch(request, response, state);
      return;
    }

    sendError(
      response,
      405,
      "method_not_allowed",
      "GET or POST /arena/matches is required",
      { method: request.method },
    );
    return;
  }

  if (request.url === "/arena/sessions") {
    if (request.method === "GET") {
      handleListSessions(response, state);
      return;
    }

    if (request.method === "POST") {
      await handleCreateSession(request, response, state);
      return;
    }

    sendError(
      response,
      405,
      "method_not_allowed",
      "GET or POST /arena/sessions is required",
      { method: request.method },
    );
    return;
  }

  if (await handleSessionRoute(request, response, state)) {
    return;
  }

  if (handleReadMatch(request, response, state)) {
    return;
  }

  sendError(response, 404, "not_found", "Arena API route was not found", {
    method: request.method,
    url: request.url,
  });
}

export async function startArenaApiServer({
  host = "127.0.0.1",
  matchStore = createInMemoryArenaMatchStore(),
  port = 0,
  sessionStore = createInMemoryArenaSessionStore(),
}: ArenaApiServerOptions = {}): Promise<ArenaApiServer> {
  const loadedMatches = await matchStore.loadMatches();
  const state: ArenaApiState = {
    matches: new Map(loadedMatches.map((record) => [record.matchID, record])),
    matchStore,
    reservedMatchIDs: new Set(),
    sessionStore,
    eventClients: new Set(),
  };
  const eventServer = new WebSocketServer({
    noServer: true,
  });
  const server = http.createServer((request, response) => {
    handleRequest(request, response, state).catch((error: unknown) => {
      sendError(response, 500, "internal_error", "Arena API server error", {
        reason: error instanceof Error ? error.message : String(error),
      });
    });
  });
  eventServer.on("connection", (client) => {
    state.eventClients.add(client);
    client.on("close", () => {
      state.eventClients.delete(client);
    });
    client.on("message", () => {
      client.close(1008, "spectator connections are read-only");
    });
  });
  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/arena/events") {
      socket.destroy();
      return;
    }

    eventServer.handleUpgrade(request, socket, head, (client) => {
      eventServer.emit("connection", client, request);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => resolve());
  });

  return {
    url: `http://${host}:${serverPort(server)}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const client of state.eventClients) {
          client.close();
        }

        eventServer.close((eventServerError) => {
          if (eventServerError) {
            reject(eventServerError);
            return;
          }

          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
      }),
  };
}

function createManualServerMatchStore(): ArenaMatchStore {
  const storeKind = process.env.ARENA_MATCH_STORE ?? "jsonl";

  if (storeKind === "postgres") {
    return createPostgresArenaMatchStore();
  }

  if (storeKind !== "jsonl") {
    throw new Error(
      `unsupported ARENA_MATCH_STORE ${storeKind}; expected jsonl or postgres`,
    );
  }

  return createJsonlArenaMatchStore(
    process.env.ARENA_MATCH_STORE_PATH ?? `${repoRoot}/arena/.local/matches.jsonl`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const server = await startArenaApiServer({
    host: process.env.ARENA_API_HOST ?? "127.0.0.1",
    matchStore: createManualServerMatchStore(),
    port: Number(process.env.ARENA_API_PORT ?? 0),
  });

  console.log(`OpenFront Agent Arena API server listening at ${server.url}`);
}
