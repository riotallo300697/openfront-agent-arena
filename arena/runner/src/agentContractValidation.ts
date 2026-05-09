import type {
  AgentAction,
  AgentInputValidation,
  AgentObservation,
} from "./types";

export type AgentContractValidation = AgentInputValidation;

function accepted(): AgentContractValidation {
  return { status: "accepted" };
}

function rejected(path: string, reason: string): AgentContractValidation {
  return { status: "rejected", path, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectRecord(
  value: unknown,
  path: string,
): Record<string, unknown> | AgentContractValidation {
  if (!isRecord(value)) {
    return rejected(path, "must be an object");
  }

  return value;
}

function expectNonEmptyString(value: unknown, path: string): AgentContractValidation {
  if (typeof value !== "string" || value.length === 0) {
    return rejected(path, "must be a non-empty string");
  }

  return accepted();
}

function expectBoolean(value: unknown, path: string): AgentContractValidation {
  if (typeof value !== "boolean") {
    return rejected(path, "must be a boolean");
  }

  return accepted();
}

function expectNonNegativeInteger(
  value: unknown,
  path: string,
): AgentContractValidation {
  if (!Number.isInteger(value) || (value as number) < 0) {
    return rejected(path, "must be a non-negative integer");
  }

  return accepted();
}

function expectKnownKeys(
  value: Record<string, unknown>,
  path: string,
  knownKeys: readonly string[],
): AgentContractValidation {
  const unknownKeys = Object.keys(value).filter((key) => !knownKeys.includes(key));

  if (unknownKeys.length > 0) {
    return rejected(path, `has unknown keys: ${unknownKeys.join(", ")}`);
  }

  return accepted();
}

function expectRequiredKeys(
  value: Record<string, unknown>,
  path: string,
  requiredKeys: readonly string[],
): AgentContractValidation {
  const missingKeys = requiredKeys.filter((key) => !(key in value));

  if (missingKeys.length > 0) {
    return rejected(path, `is missing keys: ${missingKeys.join(", ")}`);
  }

  return accepted();
}

function firstRejected(
  validations: readonly AgentContractValidation[],
): AgentContractValidation {
  return validations.find((validation) => validation.status === "rejected") ?? accepted();
}

function validateSelf(value: unknown): AgentContractValidation {
  const self = expectRecord(value, "self");
  if ("status" in self) {
    return self;
  }

  const keys = ["clientID", "name", "hasSpawned", "tilesOwned"] as const;

  return firstRejected([
    expectKnownKeys(self, "self", keys),
    expectRequiredKeys(self, "self", keys),
    expectNonEmptyString(self.clientID, "self.clientID"),
    expectNonEmptyString(self.name, "self.name"),
    expectBoolean(self.hasSpawned, "self.hasSpawned"),
    expectNonNegativeInteger(self.tilesOwned, "self.tilesOwned"),
  ]);
}

function validatePublicPlayer(value: unknown, index: number): AgentContractValidation {
  const path = `players[${index}]`;
  const player = expectRecord(value, path);
  if ("status" in player) {
    return player;
  }

  const keys = [
    "playerID",
    "clientID",
    "name",
    "isAlive",
    "hasSpawned",
    "tilesOwned",
  ] as const;

  const clientIDValidation =
    player.clientID === null
      ? accepted()
      : expectNonEmptyString(player.clientID, `${path}.clientID`);

  return firstRejected([
    expectKnownKeys(player, path, keys),
    expectRequiredKeys(player, path, keys),
    expectNonEmptyString(player.playerID, `${path}.playerID`),
    clientIDValidation,
    expectNonEmptyString(player.name, `${path}.name`),
    expectBoolean(player.isAlive, `${path}.isAlive`),
    expectBoolean(player.hasSpawned, `${path}.hasSpawned`),
    expectNonNegativeInteger(player.tilesOwned, `${path}.tilesOwned`),
  ]);
}

export function validateAgentObservationShape(
  value: unknown,
): AgentContractValidation {
  const observation = expectRecord(value, "observation");
  if ("status" in observation) {
    return observation;
  }

  const keys = ["tick", "self", "players"] as const;
  const topLevelValidation = firstRejected([
    expectKnownKeys(observation, "observation", keys),
    expectRequiredKeys(observation, "observation", keys),
    expectNonNegativeInteger(observation.tick, "tick"),
    validateSelf(observation.self),
  ]);

  if (topLevelValidation.status === "rejected") {
    return topLevelValidation;
  }

  if (!Array.isArray(observation.players)) {
    return rejected("players", "must be an array");
  }

  for (const [index, player] of observation.players.entries()) {
    const playerValidation = validatePublicPlayer(player, index);
    if (playerValidation.status === "rejected") {
      return playerValidation;
    }
  }

  return accepted();
}

export function isAgentObservation(value: unknown): value is AgentObservation {
  return validateAgentObservationShape(value).status === "accepted";
}

export function validateAgentActionShape(value: unknown): AgentContractValidation {
  const action = expectRecord(value, "action");
  if ("status" in action) {
    return action;
  }

  if (typeof action.type !== "string") {
    return rejected("action.type", "must be a string");
  }

  switch (action.type) {
    case "wait":
      return firstRejected([
        expectKnownKeys(action, "action", ["type"]),
        expectRequiredKeys(action, "action", ["type"]),
      ]);
    case "spawn":
      return firstRejected([
        expectKnownKeys(action, "action", ["type", "x", "y"]),
        expectRequiredKeys(action, "action", ["type", "x", "y"]),
        Number.isInteger(action.x)
          ? accepted()
          : rejected("action.x", "must be an integer"),
        Number.isInteger(action.y)
          ? accepted()
          : rejected("action.y", "must be an integer"),
      ]);
    case "attack": {
      const troopsValidation =
        action.troops === null ||
        (typeof action.troops === "number" &&
          Number.isFinite(action.troops) &&
          action.troops >= 0)
          ? accepted()
          : rejected("action.troops", "must be null or a non-negative number");

      return firstRejected([
        expectKnownKeys(action, "action", ["type", "target", "troops"]),
        expectRequiredKeys(action, "action", ["type", "target", "troops"]),
        action.target === "neutral"
          ? accepted()
          : rejected("action.target", 'must be "neutral"'),
        troopsValidation,
      ]);
    }
    default:
      return rejected("action.type", `unknown action type: ${action.type}`);
  }
}

export function isAgentAction(value: unknown): value is AgentAction {
  return validateAgentActionShape(value).status === "accepted";
}
