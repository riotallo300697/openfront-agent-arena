import type { AgentObservation, ExternalAgentClient } from "./types";

export type HttpAgentRequest = {
  observation: AgentObservation;
};

export type HttpAgentResponse = {
  action: unknown;
};

export type HttpAgentFetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
};

export type HttpAgentFetch = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<HttpAgentFetchResponse>;

export type HttpAgentClientOptions = {
  name: string;
  endpoint: string;
  fetchImpl?: HttpAgentFetch;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function defaultFetch(
  url: string,
  init: Parameters<HttpAgentFetch>[1],
): Promise<HttpAgentFetchResponse> {
  return fetch(url, init);
}

export class HttpAgentClient implements ExternalAgentClient {
  readonly name: string;
  readonly endpoint: string;
  private readonly fetchImpl: HttpAgentFetch;

  constructor({ endpoint, fetchImpl = defaultFetch, name }: HttpAgentClientOptions) {
    this.name = name;
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl;
  }

  async decide(observation: AgentObservation): Promise<unknown> {
    const request = {
      observation,
    } satisfies HttpAgentRequest;
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `agent endpoint returned ${response.status} ${response.statusText}`,
      );
    }

    const body = await response.json();

    if (!isRecord(body) || !("action" in body)) {
      throw new Error("agent endpoint response must be an object with action");
    }

    const httpResponse = body satisfies HttpAgentResponse;

    return httpResponse.action;
  }
}
