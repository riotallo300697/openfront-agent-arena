import http, { type IncomingMessage, type ServerResponse } from "node:http";

import type { AgentAction, AgentObservation } from "../runner/src/types";

export type HttpExampleAgentServer = {
  readonly url: string;
  close(): Promise<void>;
};

export type HttpExampleAgentServerOptions = {
  host?: string;
  port?: number;
  spawn: {
    x: number;
    y: number;
  };
};

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "content-type": "application/json",
  });
  response.end(JSON.stringify(body));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decide(
  observation: AgentObservation,
  spawn: HttpExampleAgentServerOptions["spawn"],
): AgentAction {
  if (!observation.self.hasSpawned) {
    return {
      type: "spawn",
      x: spawn.x,
      y: spawn.y,
    };
  }

  return { type: "wait" };
}

export async function startHttpExampleAgentServer({
  host = "127.0.0.1",
  port = 0,
  spawn,
}: HttpExampleAgentServerOptions): Promise<HttpExampleAgentServer> {
  const server = http.createServer(async (request, response) => {
    if (request.url !== "/decide") {
      sendJson(response, 404, { error: "not found" });
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 405, { error: "method not allowed" });
      return;
    }

    try {
      const body = JSON.parse(await readRequestBody(request)) as unknown;

      if (!isRecord(body) || !isRecord(body.observation)) {
        sendJson(response, 400, {
          error: "request body must be an object with observation",
        });
        return;
      }

      sendJson(response, 200, {
        action: decide(body.observation as AgentObservation, spawn),
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => resolve());
  });

  const address = server.address();

  if (!isRecord(address) || typeof address.port !== "number") {
    throw new Error("HTTP example agent server did not expose a port");
  }

  return {
    url: `http://${host}:${address.port}`,
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
