import { WebSocket } from "ws";
import type { ArenaApiEvent } from "../../server/src/arenaApiEvents";
import type { ArenaSessionMatchArtifact } from "../../server/src/arenaSessionMatchArtifact";
import type {
  ArenaMatchRequest,
  ArenaApiError,
} from "../../server/src/arenaMatchRequestValidation";
import type { ReplayMatchResult } from "../../runner/src/types";

export type ArenaHealthResponse = {
  ok: true;
  service: "openfront-agent-arena";
  mode: "local";
};

export type ArenaReplayMetadata = {
  matchID: string;
  format: "openfront-agent-arena-jsonl";
  path: string;
};

export type ArenaMatchRecord = {
  matchID: string;
  status: "completed";
  createdAt: string;
  completedAt: string;
  map: ArenaMatchRequest["map"];
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  runner: "api-http";
  agents: ArenaMatchRequest["agents"];
  result: ReplayMatchResult;
  replay: Omit<ArenaReplayMetadata, "matchID">;
};

export type ArenaListMatchesResponse = {
  matches: ArenaMatchRecord[];
};

export type ArenaListSessionArtifactsResponse = {
  artifacts: ArenaSessionMatchArtifact[];
};

export type ArenaClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export type ArenaEventSubscription = {
  close(): Promise<void>;
};

export type ArenaEventCollector = {
  readonly events: ArenaApiEvent[];
  waitForMatchEnded(): Promise<ArenaApiEvent[]>;
  close(): Promise<void>;
};

export class ArenaClientHttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly arenaError: ArenaApiError | null;

  constructor({
    body,
    status,
  }: {
    body: unknown;
    status: number;
  }) {
    const arenaError = readArenaError(body);
    super(
      arenaError === null
        ? `Arena API request failed with status ${status}`
        : `Arena API request failed with status ${status}: ${arenaError.code}`,
    );
    this.name = "ArenaClientHttpError";
    this.status = status;
    this.body = body;
    this.arenaError = arenaError;
  }
}

function readArenaError(body: unknown): ArenaApiError | null {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return null;
  }

  const error = body.error;
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const maybeError = error as Partial<ArenaApiError>;
  if (
    typeof maybeError.code !== "string" ||
    typeof maybeError.message !== "string" ||
    typeof maybeError.details !== "object" ||
    maybeError.details === null
  ) {
    return null;
  }

  return {
    code: maybeError.code,
    message: maybeError.message,
    details: maybeError.details,
  };
}

function readJsonMessage(message: WebSocket.RawData): unknown {
  return JSON.parse(message.toString()) as unknown;
}

export class ArenaClient {
  private readonly baseUrl: URL;
  private readonly fetchImpl: typeof fetch;

  constructor({ baseUrl, fetch: fetchImpl = fetch }: ArenaClientOptions) {
    this.baseUrl = new URL(baseUrl);
    this.fetchImpl = fetchImpl;
  }

  health(): Promise<ArenaHealthResponse> {
    return this.requestJson("/arena/health");
  }

  createMatch(request: ArenaMatchRequest): Promise<ArenaMatchRecord> {
    return this.requestJson("/arena/matches", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
  }

  listMatches(): Promise<ArenaListMatchesResponse> {
    return this.requestJson("/arena/matches");
  }

  getMatch(matchID: string): Promise<ArenaMatchRecord> {
    return this.requestJson(`/arena/matches/${encodeURIComponent(matchID)}`);
  }

  getResult(matchID: string): Promise<ReplayMatchResult> {
    return this.requestJson(
      `/arena/matches/${encodeURIComponent(matchID)}/result`,
    );
  }

  getReplay(matchID: string): Promise<ArenaReplayMetadata> {
    return this.requestJson(
      `/arena/matches/${encodeURIComponent(matchID)}/replay`,
    );
  }

  listSessionArtifacts(): Promise<ArenaListSessionArtifactsResponse> {
    return this.requestJson("/arena/session-artifacts");
  }

  getSessionArtifact(sessionID: string): Promise<ArenaSessionMatchArtifact> {
    return this.requestJson(
      `/arena/session-artifacts/${encodeURIComponent(sessionID)}`,
    );
  }

  async connectEvents({
    onEvent,
  }: {
    onEvent: (event: ArenaApiEvent) => void;
  }): Promise<ArenaEventSubscription> {
    const socket = new WebSocket(this.eventsUrl());

    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", reject);
    });

    socket.on("message", (message) => {
      onEvent(readJsonMessage(message) as ArenaApiEvent);
    });

    return {
      close: () =>
        new Promise<void>((resolve) => {
          if (
            socket.readyState === WebSocket.CLOSED ||
            socket.readyState === WebSocket.CLOSING
          ) {
            resolve();
            return;
          }

          socket.once("close", () => resolve());
          socket.close();
        }),
    };
  }

  async createEventCollector({
    matchID,
    timeoutMs = 5000,
  }: {
    matchID?: string;
    timeoutMs?: number;
  } = {}): Promise<ArenaEventCollector> {
    const events: ArenaApiEvent[] = [];
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let resolveEnded: (events: ArenaApiEvent[]) => void = () => undefined;
    let rejectEnded: (error: Error) => void = () => undefined;
    const ended = new Promise<ArenaApiEvent[]>((resolve, reject) => {
      resolveEnded = resolve;
      rejectEnded = reject;
      timeout = setTimeout(() => {
        reject(new Error("timed out waiting for match.ended"));
      }, timeoutMs);
    });

    const subscription = await this.connectEvents({
      onEvent: (event) => {
        if (matchID !== undefined && event.matchID !== matchID) {
          return;
        }

        events.push(event);

        if (event.type === "match.ended") {
          if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
          }

          resolveEnded(events);
        }
      },
    });

    return {
      events,
      waitForMatchEnded: () => ended,
      close: async () => {
        if (timeout !== null) {
          clearTimeout(timeout);
          timeout = null;
          rejectEnded(new Error("event collector closed before match.ended"));
        }

        await subscription.close();
      },
    };
  }

  private async requestJson<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await this.fetchImpl(this.httpUrl(path), init);
    const body = (await response.json()) as unknown;

    if (!response.ok) {
      throw new ArenaClientHttpError({
        status: response.status,
        body,
      });
    }

    return body as T;
  }

  private httpUrl(path: string): string {
    return new URL(path, this.baseUrl).toString();
  }

  private eventsUrl(): string {
    const url = new URL(this.baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/arena/events";
    url.search = "";
    url.hash = "";
    return url.toString();
  }
}
