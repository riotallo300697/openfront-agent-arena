import type { ArenaApiError } from "./arenaMatchRequestValidation";

export type ArenaSessionCreateRequest = {
  sessionID?: string;
  matchID: string;
  map: "tests/testdata/maps/plains";
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  maxAgents: 2;
};

export type ArenaSessionJoinRequest = {
  clientID: string;
  name: string;
};

export type ArenaSessionRequestValidation<T> =
  | {
      status: "accepted";
      request: T;
    }
  | {
      status: "rejected";
      error: ArenaApiError;
    };

const supportedMap = "tests/testdata/maps/plains";
const idPattern = /^[A-Za-z0-9_-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && value > 0;
}

function invalidRequest<T>(
  path: string,
  message: string,
): ArenaSessionRequestValidation<T> {
  return {
    status: "rejected",
    error: {
      code: "invalid_session_request",
      message,
      details: {
        path,
      },
    },
  };
}

function validateID<T>({
  path,
  required,
  value,
}: {
  path: string;
  required: boolean;
  value: unknown;
}): ArenaSessionRequestValidation<T> | null {
  if (value === undefined && !required) {
    return null;
  }

  if (!isNonEmptyString(value)) {
    return invalidRequest(path, `${path} must be a non-empty string`);
  }

  if (!idPattern.test(value)) {
    return invalidRequest(
      path,
      `${path} may contain only letters, numbers, underscores, and hyphens`,
    );
  }

  return null;
}

export function validateArenaSessionCreateRequest(
  body: unknown,
): ArenaSessionRequestValidation<ArenaSessionCreateRequest> {
  if (!isRecord(body)) {
    return invalidRequest("$", "request body must be an object");
  }

  const sessionIDError = validateID<ArenaSessionCreateRequest>({
    path: "sessionID",
    required: false,
    value: body.sessionID,
  });
  if (sessionIDError !== null) {
    return sessionIDError;
  }

  const matchIDError = validateID<ArenaSessionCreateRequest>({
    path: "matchID",
    required: true,
    value: body.matchID,
  });
  if (matchIDError !== null) {
    return matchIDError;
  }

  if (body.map !== supportedMap) {
    return invalidRequest(
      "map",
      `map must be ${JSON.stringify(supportedMap)}`,
    );
  }

  if (!isPositiveInteger(body.maxTicks)) {
    return invalidRequest("maxTicks", "maxTicks must be a positive integer");
  }

  if (!isPositiveInteger(body.agentDecisionTimeoutMs)) {
    return invalidRequest(
      "agentDecisionTimeoutMs",
      "agentDecisionTimeoutMs must be a positive integer",
    );
  }

  if (body.maxAgents !== undefined && body.maxAgents !== 2) {
    return invalidRequest("maxAgents", "maxAgents must be 2");
  }

  return {
    status: "accepted",
    request: {
      sessionID:
        typeof body.sessionID === "string" ? body.sessionID : undefined,
      matchID: body.matchID,
      map: body.map,
      maxTicks: body.maxTicks,
      agentDecisionTimeoutMs: body.agentDecisionTimeoutMs,
      maxAgents: 2,
    },
  };
}

export function validateArenaSessionJoinRequest(
  body: unknown,
): ArenaSessionRequestValidation<ArenaSessionJoinRequest> {
  if (!isRecord(body)) {
    return invalidRequest("$", "request body must be an object");
  }

  const clientIDError = validateID<ArenaSessionJoinRequest>({
    path: "clientID",
    required: true,
    value: body.clientID,
  });
  if (clientIDError !== null) {
    return clientIDError;
  }

  if (!isNonEmptyString(body.name)) {
    return invalidRequest("name", "name must be a non-empty string");
  }

  return {
    status: "accepted",
    request: {
      clientID: body.clientID,
      name: body.name,
    },
  };
}
