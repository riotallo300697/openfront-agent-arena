import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { runArenaHttpMatch } from "./arenaHttpMatchRunner";
import { validateArenaMatchRequest } from "./arenaMatchRequestValidation";
import type { ReplayMatchResult } from "../../runner/src/types";

export type ArenaApiServer = {
  readonly url: string;
  close(): Promise<void>;
};

export type ArenaApiServerOptions = {
  host?: string;
  port?: number;
};

const healthResponse = {
  ok: true,
  service: "openfront-agent-arena",
  mode: "local",
} as const;

const maxRequestBodyBytes = 64 * 1024;

type ArenaMatchRecord = {
  matchID: string;
  status: "completed";
  createdAt: string;
  completedAt: string;
  result: ReplayMatchResult;
  replay: {
    format: "openfront-agent-arena-jsonl";
    path: string;
  };
};

type ArenaApiState = {
  matches: Map<string, ArenaMatchRecord>;
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

    request.on("data", (chunk: Buffer) => {
      bytes += chunk.length;

      if (bytes > maxRequestBodyBytes) {
        request.destroy(new Error("request body is too large"));
        return;
      }

      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
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

  const createdAt = new Date().toISOString();
  const result = await runArenaHttpMatch(validation.request);
  const completedAt = new Date().toISOString();
  const record: ArenaMatchRecord = {
    matchID: validation.request.matchID,
    status: "completed",
    createdAt,
    completedAt,
    result,
    replay: {
      format: "openfront-agent-arena-jsonl",
      path: result.replay,
    },
  };

  state.matches.set(record.matchID, record);

  sendJson(response, 200, record);
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
    await handleCreateMatch(request, response, state);
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
  port = 0,
}: ArenaApiServerOptions = {}): Promise<ArenaApiServer> {
  const state: ArenaApiState = {
    matches: new Map(),
  };
  const server = http.createServer((request, response) => {
    handleRequest(request, response, state).catch((error: unknown) => {
      sendError(response, 500, "internal_error", "Arena API server error", {
        reason: error instanceof Error ? error.message : String(error),
      });
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => resolve());
  });

  return {
    url: `http://${host}:${serverPort(server)}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const server = await startArenaApiServer({
    host: process.env.ARENA_API_HOST ?? "127.0.0.1",
    port: Number(process.env.ARENA_API_PORT ?? 0),
  });

  console.log(`OpenFront Agent Arena API server listening at ${server.url}`);
}
