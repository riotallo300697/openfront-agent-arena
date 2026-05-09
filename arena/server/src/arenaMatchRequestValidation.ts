export type ArenaApiError = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};

export type ArenaMatchAgentRequest = {
  clientID: string;
  name: string;
  endpoint: string;
  spawn: {
    x: number;
    y: number;
  };
};

export type ArenaMatchRequest = {
  matchID: string;
  map: "tests/testdata/maps/plains";
  maxTicks: number;
  agentDecisionTimeoutMs: number;
  agents: ArenaMatchAgentRequest[];
};

export type ArenaMatchRequestValidation =
  | {
      status: "accepted";
      request: ArenaMatchRequest;
    }
  | {
      status: "rejected";
      error: ArenaApiError;
    };

type ArenaMatchAgentRequestValidation =
  | {
      status: "accepted";
      request: ArenaMatchAgentRequest;
    }
  | {
      status: "rejected";
      error: ArenaApiError;
    };

const supportedMap = "tests/testdata/maps/plains";
const supportedEndpointHosts = new Set(["127.0.0.1", "localhost"]);
const matchIDPattern = /^[A-Za-z0-9_-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidMatchRequest(
  path: string,
  message: string,
): ArenaMatchRequestValidation {
  return {
    status: "rejected",
    error: {
      code: "invalid_match_request",
      message,
      details: {
        path,
      },
    },
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && value >= 0;
}

function isLocalhostDecideEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      supportedEndpointHosts.has(url.hostname) &&
      url.pathname === "/decide"
    );
  } catch {
    return false;
  }
}

function validateAgent(
  value: unknown,
  index: number,
): ArenaMatchAgentRequestValidation {
  const path = `agents[${index}]`;

  if (!isRecord(value)) {
    return invalidMatchRequest(path, "agent must be an object");
  }

  if (!isNonEmptyString(value.clientID)) {
    return invalidMatchRequest(`${path}.clientID`, "clientID must be a non-empty string");
  }

  if (!isNonEmptyString(value.name)) {
    return invalidMatchRequest(`${path}.name`, "name must be a non-empty string");
  }

  if (!isNonEmptyString(value.endpoint)) {
    return invalidMatchRequest(`${path}.endpoint`, "endpoint must be a non-empty string");
  }

  if (!isLocalhostDecideEndpoint(value.endpoint)) {
    return invalidMatchRequest(
      `${path}.endpoint`,
      "endpoint must be a localhost HTTP /decide URL",
    );
  }

  if (!isRecord(value.spawn)) {
    return invalidMatchRequest(`${path}.spawn`, "spawn must be an object");
  }

  if (!isNonNegativeInteger(value.spawn.x)) {
    return invalidMatchRequest(`${path}.spawn.x`, "spawn.x must be a non-negative integer");
  }

  if (!isNonNegativeInteger(value.spawn.y)) {
    return invalidMatchRequest(`${path}.spawn.y`, "spawn.y must be a non-negative integer");
  }

  return {
    status: "accepted",
    request: {
      clientID: value.clientID,
      name: value.name,
      endpoint: value.endpoint,
      spawn: {
        x: value.spawn.x,
        y: value.spawn.y,
      },
    },
  };
}

export function validateArenaMatchRequest(
  value: unknown,
): ArenaMatchRequestValidation {
  if (!isRecord(value)) {
    return invalidMatchRequest("$", "request body must be an object");
  }

  if (!isNonEmptyString(value.matchID)) {
    return invalidMatchRequest("matchID", "matchID must be a non-empty string");
  }

  if (!matchIDPattern.test(value.matchID)) {
    return invalidMatchRequest(
      "matchID",
      "matchID may contain only letters, numbers, underscores, and hyphens",
    );
  }

  if (value.map !== supportedMap) {
    return invalidMatchRequest(
      "map",
      `map must be ${JSON.stringify(supportedMap)}`,
    );
  }

  if (!isPositiveInteger(value.maxTicks)) {
    return invalidMatchRequest("maxTicks", "maxTicks must be a positive integer");
  }

  if (!isPositiveInteger(value.agentDecisionTimeoutMs)) {
    return invalidMatchRequest(
      "agentDecisionTimeoutMs",
      "agentDecisionTimeoutMs must be a positive integer",
    );
  }

  if (!Array.isArray(value.agents)) {
    return invalidMatchRequest("agents", "agents must be an array");
  }

  if (value.agents.length !== 2) {
    return invalidMatchRequest("agents", "agents must contain exactly 2 agents");
  }

  const agents: ArenaMatchAgentRequest[] = [];
  const clientIDs = new Set<string>();

  for (const [index, agentValue] of value.agents.entries()) {
    const validation = validateAgent(agentValue, index);
    if (validation.status === "rejected") {
      return validation;
    }

    if (clientIDs.has(validation.request.clientID)) {
      return invalidMatchRequest(
        `agents[${index}].clientID`,
        "agent clientID values must be unique",
      );
    }

    clientIDs.add(validation.request.clientID);
    agents.push(validation.request);
  }

  return {
    status: "accepted",
    request: {
      matchID: value.matchID,
      map: supportedMap,
      maxTicks: value.maxTicks,
      agentDecisionTimeoutMs: value.agentDecisionTimeoutMs,
      agents,
    },
  };
}
