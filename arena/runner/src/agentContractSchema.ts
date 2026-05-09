export type JsonSchema = {
  readonly [key: string]: unknown;
};

const nonNegativeIntegerSchema = {
  type: "integer",
  minimum: 0,
} as const satisfies JsonSchema;

const nonEmptyStringSchema = {
  type: "string",
  minLength: 1,
} as const satisfies JsonSchema;

const agentPublicPlayerSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "playerID",
    "clientID",
    "name",
    "isAlive",
    "hasSpawned",
    "tilesOwned",
  ],
  properties: {
    playerID: nonEmptyStringSchema,
    clientID: {
      oneOf: [nonEmptyStringSchema, { type: "null" }],
    },
    name: nonEmptyStringSchema,
    isAlive: { type: "boolean" },
    hasSpawned: { type: "boolean" },
    tilesOwned: nonNegativeIntegerSchema,
  },
} as const satisfies JsonSchema;

export const agentObservationSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://openfront.local/agent-arena/schemas/agent-observation.schema.json",
  title: "AgentObservation",
  type: "object",
  additionalProperties: false,
  required: ["tick", "self", "players"],
  properties: {
    tick: nonNegativeIntegerSchema,
    self: {
      type: "object",
      additionalProperties: false,
      required: ["clientID", "name", "hasSpawned", "tilesOwned"],
      properties: {
        clientID: nonEmptyStringSchema,
        name: nonEmptyStringSchema,
        hasSpawned: { type: "boolean" },
        tilesOwned: nonNegativeIntegerSchema,
      },
    },
    players: {
      type: "array",
      items: agentPublicPlayerSchema,
    },
  },
} as const satisfies JsonSchema;

const spawnActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "x", "y"],
  properties: {
    type: { const: "spawn" },
    x: { type: "integer" },
    y: { type: "integer" },
  },
} as const satisfies JsonSchema;

const waitActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type"],
  properties: {
    type: { const: "wait" },
  },
} as const satisfies JsonSchema;

const attackActionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "target", "troops"],
  properties: {
    type: { const: "attack" },
    target: { const: "neutral" },
    troops: {
      oneOf: [{ type: "number", minimum: 0 }, { type: "null" }],
    },
  },
} as const satisfies JsonSchema;

export const agentActionSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://openfront.local/agent-arena/schemas/agent-action.schema.json",
  title: "AgentAction",
  oneOf: [spawnActionSchema, waitActionSchema, attackActionSchema],
} as const satisfies JsonSchema;

export const agentContractSchemas = {
  observation: agentObservationSchema,
  action: agentActionSchema,
} as const;
