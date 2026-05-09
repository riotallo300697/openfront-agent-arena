import {
  agentActionSchema,
  agentContractSchemas,
  agentObservationSchema,
} from "./agentContractSchema";
import {
  validateAgentActionShape,
  validateAgentObservationShape,
} from "./agentContractValidation";
import { expectCondition, expectJsonEqual } from "./smokeAssert";
import type { AgentAction, AgentObservation } from "./types";

function expectAccepted(name: string, validation: { status: string }) {
  expectJsonEqual(name, validation, { status: "accepted" });
}

function expectRejected(
  name: string,
  validation: { status: string; path?: string; reason?: string },
  expected: { path: string; reason: string },
) {
  expectJsonEqual(name, validation, {
    status: "rejected",
    path: expected.path,
    reason: expected.reason,
  });
}

const validObservation: AgentObservation = {
  tick: 3,
  self: {
    clientID: "schema-agent-a",
    name: "SchemaAgentA",
    hasSpawned: true,
    tilesOwned: 52,
  },
  players: [
    {
      playerID: "player-a",
      clientID: "schema-agent-a",
      name: "SchemaAgentA",
      isAlive: true,
      hasSpawned: true,
      tilesOwned: 52,
    },
    {
      playerID: "player-b",
      clientID: "schema-agent-b",
      name: "SchemaAgentB",
      isAlive: false,
      hasSpawned: false,
      tilesOwned: 0,
    },
  ],
};

const validActions: AgentAction[] = [
  { type: "wait" },
  { type: "spawn", x: 10, y: 20 },
  { type: "attack", target: "neutral", troops: null },
  { type: "attack", target: "neutral", troops: 25 },
];

expectCondition(
  "agent contract schemas expose observation schema",
  agentContractSchemas.observation === agentObservationSchema,
  agentContractSchemas,
);
expectCondition(
  "agent contract schemas expose action schema",
  agentContractSchemas.action === agentActionSchema,
  agentContractSchemas,
);
expectCondition(
  "observation schema has JSON Schema draft",
  agentObservationSchema.$schema === "https://json-schema.org/draft/2020-12/schema",
  agentObservationSchema,
);
expectCondition(
  "action schema has JSON Schema draft",
  agentActionSchema.$schema === "https://json-schema.org/draft/2020-12/schema",
  agentActionSchema,
);

expectAccepted(
  "valid observation is accepted",
  validateAgentObservationShape(validObservation),
);

for (const action of validActions) {
  expectAccepted(
    `valid action is accepted: ${action.type}`,
    validateAgentActionShape(action),
  );
}

expectRejected(
  "observation rejects missing player name",
  validateAgentObservationShape({
    ...validObservation,
    players: [{ ...validObservation.players[0], name: "" }],
  }),
  {
    path: "players[0].name",
    reason: "must be a non-empty string",
  },
);
expectRejected(
  "observation rejects unknown top-level keys",
  validateAgentObservationShape({
    ...validObservation,
    privateMapData: [],
  }),
  {
    path: "observation",
    reason: "has unknown keys: privateMapData",
  },
);
expectRejected(
  "action rejects unknown action type",
  validateAgentActionShape({ type: "build" }),
  {
    path: "action.type",
    reason: "unknown action type: build",
  },
);
expectRejected(
  "action rejects extra wait keys",
  validateAgentActionShape({ type: "wait", x: 1 }),
  {
    path: "action",
    reason: "has unknown keys: x",
  },
);
expectRejected(
  "action rejects fractional spawn x",
  validateAgentActionShape({ type: "spawn", x: 10.5, y: 20 }),
  {
    path: "action.x",
    reason: "must be an integer",
  },
);
expectRejected(
  "action rejects non-neutral attack target",
  validateAgentActionShape({ type: "attack", target: "player", troops: null }),
  {
    path: "action.target",
    reason: 'must be "neutral"',
  },
);

console.log("OpenFront Agent Arena agent contract smoke check passed.");
console.log(
  JSON.stringify(
    {
      schemas: [
        agentObservationSchema.title,
        agentActionSchema.title,
      ],
      validActions: validActions.length,
      rejectedCases: 6,
    },
    null,
    2,
  ),
);
